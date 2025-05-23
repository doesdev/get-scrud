import http from 'http'
import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

const debugLog = (...args) => { /* console.debug(...args) */ }
const actionList = ['search', 'create', 'read', 'update', 'delete']
const state = {
  browser: undefined,
  page: undefined,
  server: undefined,
  staticServerPort: undefined,
  forwardBrowserErrors: true
}

export const toggleBrowserErrors = (enabled = true) => {
  state.forwardBrowserErrors = enabled
}

const startServer = async (port = 0) => {
  state.server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      return res.end()
    }

    const requestUrl = req.url
    let servePath = '.' + requestUrl

    if (requestUrl === '/') servePath = './test/_browser/index.html'

    let isMainModule = false

    if (requestUrl === '/scrud-main-module.js') {
      servePath = './index.js'
      isMainModule = true
    } else if (requestUrl.startsWith('/node_modules/')) {
      servePath = '.' + requestUrl
    }

    const extname = String(path.extname(servePath)).toLowerCase()
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml'
    }

    const contentType = mimeTypes[extname] || 'application/octet-stream'

    try {
      let content = await fs.promises.readFile(servePath, 'utf-8')

      if (isMainModule) {
        debugLog('[Runner] Rewriting imports for /scrud-main-module.js')
        content = content.replace(/from 'pico-ms'/g, "from '/node_modules/pico-ms/index.js'")
        content = content.replace(/from 'ricks-bricks'/g, "from '/node_modules/ricks-bricks/index.js'")
        // Add more replacements here if needed for other direct dependencies
      }

      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content, 'utf-8')
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.error(`[Runner] File not found: ${servePath} (requested ${requestUrl})`)

        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('404: File not found', 'utf-8')
      } else {
        console.error(`[Runner] Server error for ${servePath}: ${error.code}`)

        res.writeHead(500)
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n')
      }
    }
  })

  return new Promise((resolve, reject) => {
    state.server.listen(port, () => {
      const address = state.server.address()
      state.staticServerPort = address.port
      debugLog(`[Runner] Static file server listening on port ${state.staticServerPort}`)
      resolve(state.staticServerPort)
    })

    state.server.on('error', reject)
  })
}

const initializePlaywright = async (port) => {
  state.browser = await chromium.launch()
  state.page = await state.browser.newPage()

  state.page.on(
    'console',
    (msg) => {
      if (!state.forwardBrowserErrors) return

      const asError = msg.type() === 'error'
      const logWith = asError ? console.error : debugLog
      logWith(`[Browser Console] ${msg.type().toUpperCase()}: ${msg.text()}`)
    })

  await state.page.route('**/*', route => {
    const request = route.request()
    debugLog(`[Runner Intercept] Request URL: ${request.url()}`)
    debugLog(`[Runner Intercept] Request Method: ${request.method()}`)
    debugLog(`[Runner Intercept] Request Headers: ${JSON.stringify(request.headers(), null, 2)}`)
    route.continue()
  })

  debugLog(`[Runner] Attempting to navigate to http://localhost:${port}/test/_browser/index.html`)
  try {
    const response = await state.page.goto(`http://localhost:${port}/test/_browser/index.html`, { waitUntil: 'domcontentloaded' })
    debugLog(`[Runner] Navigation to index.html successful. Status: ${response?.status()}`)
  } catch (ex) {
    console.error('[Runner] Error during page.goto:', ex)
    throw ex
  }

  debugLog('[Runner] Waiting for window.isScrudPageReady === true...')
  try {
    await state.page.waitForFunction(() => window.isScrudPageReady === true, null, { timeout: 10000 })
    debugLog('[Runner] Playwright page loaded and window.isScrudPageReady is true.')

    const browserError = await state.page.evaluate(() => window.browserInitializationError)

    if (browserError) {
      console.error('[Runner] Error reported from browser during initialization:', browserError)
      throw new Error(`Browser-side initialization failed: ${browserError}`)
    }

    debugLog('[Runner] No browser-side initialization errors reported.')
  } catch (ex) {
    console.error(
      '[Runner] Timeout or error during waitForFunction for window.isScrudPageReady:',
      ex
    )

    try {
      const currentValue = await state.page.evaluate(() => window.isScrudPageReady)
      console.error(`[Runner] Current value of window.isScrudPageReady in browser: ${currentValue}`)
      const pageContent = await state.page.content()
      console.error('[Runner] Current page content:\n', pageContent.substring(0, 500) + '...')
    } catch (evalError) {
      console.error('[Runner] Could not evaluate window.isScrudPageReady or get page content:', evalError)
    }

    throw ex
  }
}

const cleanup = async () => {
  if (state.browser) await state.browser.close()
  if (state.server) state.server.close()
}

process.on('exit', cleanup)
process.on('SIGINT', async () => {
  await cleanup()
  process.exit()
})

let playwrightInitialized = false
let initializationPromise = null

export const start = async () => {
  if (playwrightInitialized && initializationPromise) {
    return initializationPromise
  }

  playwrightInitialized = true

  try {
    const port = await startServer()
    await initializePlaywright(port)
    debugLog('[Runner] Server and Playwright initialized.')
  } catch (error) {
    console.error('[Runner] Failed to initialize server or Playwright:', error)
    playwrightInitialized = false
    await cleanup()
    throw error
  }
}

initializationPromise = start()

export const getStaticServerOrigin = async () => {
  await initializationPromise

  if (typeof state.staticServerPort === 'undefined') {
    console.error('[Runner] state.staticServerPort is undefined after initialization. This should not happen.')
    throw new Error('[Runner] Static server port not available after initialization.')
  }

  return `http://localhost:${state.staticServerPort}`
}

export const getScrud = (opts) => {
  let browserInstanceInitialized = false

  const scrudInstance = async (api, action, id, body, jwt, contextData) => {
    try {
      await initializationPromise
    } catch (initError) {
      console.error('[Runner] Playwright initialization failed:', initError)
      throw new Error(`Playwright initialization failed: ${initError.message}`)
    }

    if (!state.page) {
      console.error('[Runner] FATAL: page object is null in getScrud proxy function.')
      throw new Error('Playwright page is not available even after initialization.')
    }

    if (!browserInstanceInitialized) {
      try {
        debugLog(
          '[Runner] Attempting to call window.initializeScrudInBrowser with opts:',
          opts
        )
        const isInitializeFnDefined = await state.page.evaluate(() => {
          return typeof window.initializeScrudInBrowser === 'function'
        })

        if (!isInitializeFnDefined) {
          const browserInitError = await state.page.evaluate(() => window.browserInitializationError)
          const errorMsg = `[Runner] window.initializeScrudInBrowser is not defined in browser. Browser-side error: ${browserInitError || 'N/A'}`
          console.error(errorMsg)

          const browserConsoleSnapshot = await state.page.evaluate(() => {
            return Array.from(window.console.history || []).map(m => m.join(' ')).slice(-10).join('\n')
          })

          console.error('[Runner] Recent browser console messages (if available):\n', browserConsoleSnapshot)
          throw new Error(errorMsg)
        }

        if (typeof opts.before === 'function') {
          opts.before = opts.before.toString()
        }

        await state.page.evaluate((options) => {
          if (typeof window.initializeScrudInBrowser !== 'function') {
            throw new Error('window.initializeScrudInBrowser disappeared or was not a function just before call')
          }
          window.initializeScrudInBrowser(options)
        }, opts)
        browserInstanceInitialized = true
        debugLog('[Runner] window.initializeScrudInBrowser called successfully.')
      } catch (err) {
        console.error('[Runner] Error initializing scrud in browser for instance:', err)
        throw err
      }
    }

    if (api && typeof api === 'object') {
      try {
        await state.page.evaluate((newOptions) => {
          if (!window.scrudInstance) {
            throw new Error('window.scrudInstance is not available for reconfiguration.')
          }

          window.scrudInstance(newOptions)
        }, api)
      } catch (err) {
        console.error('[Runner] Error re-configuring scrud in browser:', err)
        throw err
      }

      return
    }

    try {
      const result = await state.page.evaluate(
        async (evalArgs) => {
          if (!window.scrudInstance) {
            throw new Error('window.scrudInstance is not initialized in the browser.')
          }

          return window.scrudInstance(
            evalArgs.api,
            evalArgs.action,
            evalArgs.id,
            evalArgs.body,
            evalArgs.jwt,
            evalArgs.contextData
          )
        },
        { api, action, id, body, jwt, contextData }
      )
      return result
    } catch (error) {
      throw new Error(error.message || 'Error from browser context')
    }
  }

  actionList.forEach((action) => {
    scrudInstance[action] = (api, id, body, jwt, contextData) => {
      return scrudInstance(api, action, id, body, jwt, contextData)
    }
  })

  return scrudInstance
}

export const stop = async () => {
  await cleanup()
  playwrightInitialized = false
  debugLog('[Runner] Server and Playwright stopped.')
}
