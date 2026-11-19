/**
 * Shared Playwright browser utilities with deep bot-detection evasion.
 *
 * Layers of defence:
 *   1. playwright-extra StealthPlugin (base layer)
 *   2. EVASION_SCRIPT injected into every page and every frame:
 *      - navigator.webdriver removal
 *      - Function.prototype.toString spoofing (patched natives look real)
 *      - Full navigator property set (vendor, platform, languages, hardware)
 *      - Realistic plugin/MimeType arrays
 *      - window dimension consistency (outerWidth/Height = 0 is a giveaway)
 *      - chrome runtime object reconstruction
 *      - Permissions API override (notifications check is a common signal)
 *      - WebGL renderer string spoofing (SwiftShader leaks headless)
 *      - Canvas fingerprint noise (imperceptible per-session variation)
 *      - AudioContext fingerprint noise
 *      - MediaDevices anonymisation
 *      - document.hasFocus() → true
 *      - CDP / Playwright global variable scrubbing (cdc_*, __pw_*, etc.)
 *      - Battery API spoofing
 *      - Connection API spoofing
 */

import { chromium } from 'playwright-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(StealthPlugin())

// ── Evasion script (injected into every browsing context) ─────────────────────

const EVASION_SCRIPT = `(function () {
  'use strict';

  // ── Utility: define non-writable property safely ──────────────────────────
  const _def = Object.defineProperty.bind(Object);
  function def(obj, prop, val) {
    try { _def(obj, prop, { get: () => val, configurable: true }); } catch (_) {}
  }

  // ── 1. Protect Function.prototype.toString ────────────────────────────────
  // Any function we patch must look like '[native code]' to detection scripts.
  const _reflectApply = Reflect.apply;
  const _origToString = Function.prototype.toString;
  const _nativeSet = new WeakSet();
  Function.prototype.toString = function toString() {
    if (_nativeSet.has(this)) return 'function ' + (this.name || '') + '() { [native code] }';
    return _reflectApply(_origToString, this, []);
  };
  _nativeSet.add(Function.prototype.toString);

  // ── 2. webdriver ──────────────────────────────────────────────────────────
  def(navigator, 'webdriver', undefined);

  // ── 3. navigator fingerprint ──────────────────────────────────────────────
  def(navigator, 'vendor',              'Google Inc.');
  def(navigator, 'platform',            'MacIntel');
  def(navigator, 'hardwareConcurrency', 8);
  def(navigator, 'deviceMemory',        8);
  def(navigator, 'languages',           ['en-GB', 'en']);
  def(navigator, 'appVersion',
    '5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

  // ── 4. Realistic plugin array ─────────────────────────────────────────────
  try {
    const pluginData = [
      { name: 'PDF Viewer',                filename: 'internal-pdf-viewer',             desc: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer',         filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', desc: 'Portable Document Format' },
      { name: 'Chromium PDF Viewer',       filename: 'internal-pdf-viewer',             desc: 'Portable Document Format' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer',             desc: 'Portable Document Format' },
      { name: 'WebKit built-in PDF',       filename: 'internal-pdf-viewer',             desc: 'Portable Document Format' },
    ];
    const plugins = Object.create(PluginArray.prototype);
    pluginData.forEach((pd, i) => {
      const p = Object.create(Plugin.prototype);
      _def(p, 'name',        { value: pd.name });
      _def(p, 'filename',    { value: pd.filename });
      _def(p, 'description', { value: pd.desc });
      _def(p, 'length',      { value: 1 });
      const mt = Object.create(MimeType.prototype);
      _def(mt, 'type',          { value: 'application/pdf' });
      _def(mt, 'description',   { value: pd.desc });
      _def(mt, 'suffixes',      { value: 'pdf' });
      _def(mt, 'enabledPlugin', { value: p });
      p[0] = mt;
      plugins[i] = p;
    });
    _def(plugins, 'length', { value: pluginData.length });
    def(navigator, 'plugins', plugins);
  } catch (_) {}

  // ── 5. Window / screen dimensions ─────────────────────────────────────────
  // outerHeight = 0 in old headless mode — most reliable headless signal
  def(window, 'outerWidth',        1280);
  def(window, 'outerHeight',        900);
  def(window, 'devicePixelRatio',     2);
  def(screen,  'width',             1280);
  def(screen,  'height',             900);
  def(screen,  'availWidth',        1280);
  def(screen,  'availHeight',        870);
  def(screen,  'colorDepth',          24);
  def(screen,  'pixelDepth',          24);

  // ── 6. chrome runtime object ──────────────────────────────────────────────
  if (!window.chrome) window.chrome = {};
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      OnInstalledReason:         { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' },
      OnRestartRequiredReason:   { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' },
      PlatformArch:              { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' },
      PlatformOs:                { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' },
      RequestUpdateCheckStatus:  { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' },
    };
  }
  window.chrome.app = window.chrome.app || { isInstalled: false };
  window.chrome.loadTimes = function loadTimes() { return {}; };
  window.chrome.csi       = function csi()       { return {}; };
  _nativeSet.add(window.chrome.loadTimes);
  _nativeSet.add(window.chrome.csi);

  // ── 7. Permissions API ────────────────────────────────────────────────────
  try {
    const _origQuery = navigator.permissions.query.bind(navigator.permissions);
    const _pq = function query(params) {
      if (params.name === 'notifications')
        return Promise.resolve({ state: Notification.permission, onchange: null });
      return _origQuery(params);
    };
    _nativeSet.add(_pq);
    navigator.permissions.query = _pq;
  } catch (_) {}

  // ── 8. WebGL — mask SwiftShader (headless GPU) ────────────────────────────
  try {
    const patchWebGL = (ctx) => {
      const orig = ctx.prototype.getParameter;
      const patched = function getParameter(param) {
        if (param === 37445) return 'Intel Inc.';
        if (param === 37446) return 'Intel Iris OpenGL Engine';
        return Reflect.apply(orig, this, [param]);
      };
      _nativeSet.add(patched);
      ctx.prototype.getParameter = patched;
    };
    patchWebGL(WebGLRenderingContext);
    if (typeof WebGL2RenderingContext !== 'undefined') patchWebGL(WebGL2RenderingContext);
  } catch (_) {}

  // ── 9. Canvas fingerprint noise ───────────────────────────────────────────
  // Adds imperceptible per-session noise so each run has a unique canvas hash.
  try {
    const _origToDataURL    = HTMLCanvasElement.prototype.toDataURL;
    const _origToBlob       = HTMLCanvasElement.prototype.toBlob;
    const _origGetImageData = CanvasRenderingContext2D.prototype.getImageData;

    function _noiseCanvas(canvas) {
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return;
      const img = Reflect.apply(_origGetImageData, ctx2d, [0, 0, Math.max(canvas.width, 1), Math.max(canvas.height, 1)]);
      // Flip one LSB in a deterministic-but-unique position
      img.data[0] ^= 1;
      ctx2d.putImageData(img, 0, 0);
    }

    const _toDataURL = function toDataURL(...a) { _noiseCanvas(this); return Reflect.apply(_origToDataURL, this, a); };
    const _toBlob    = function toBlob(cb, ...a) { _noiseCanvas(this); return Reflect.apply(_origToBlob, this, [cb, ...a]); };
    const _getImgData = function getImageData(x, y, w, h) {
      const d = Reflect.apply(_origGetImageData, this, [x, y, w, h]);
      if (d.data.length > 0) d.data[0] ^= 1;
      return d;
    };
    _nativeSet.add(_toDataURL); _nativeSet.add(_toBlob); _nativeSet.add(_getImgData);
    HTMLCanvasElement.prototype.toDataURL    = _toDataURL;
    HTMLCanvasElement.prototype.toBlob       = _toBlob;
    CanvasRenderingContext2D.prototype.getImageData = _getImgData;
  } catch (_) {}

  // ── 10. AudioContext fingerprint noise ────────────────────────────────────
  try {
    const _origGetChannelData = AudioBuffer.prototype.getChannelData;
    AudioBuffer.prototype.getChannelData = function getChannelData(ch) {
      const arr = Reflect.apply(_origGetChannelData, this, [ch]);
      for (let i = 0; i < arr.length; i += 200) arr[i] += 1e-7 * (Math.random() - 0.5);
      return arr;
    };
    _nativeSet.add(AudioBuffer.prototype.getChannelData);
  } catch (_) {}

  // ── 11. MediaDevices — anonymise until permission granted ─────────────────
  try {
    const _origEnum = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices = async function enumerateDevices() {
      return (await _origEnum()).map(d => ({ deviceId: '', groupId: '', kind: d.kind, label: '' }));
    };
  } catch (_) {}

  // ── 12. document.hasFocus ─────────────────────────────────────────────────
  // Headless returns false — many anti-bot scripts check this.
  try { def(document, 'hasFocus', () => true); } catch (_) {}

  // ── 13. Battery API ───────────────────────────────────────────────────────
  try {
    const _battery = function getBattery() {
      return Promise.resolve({ charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1.0, addEventListener: () => {}, removeEventListener: () => {} });
    };
    _nativeSet.add(_battery);
    navigator.getBattery = _battery;
  } catch (_) {}

  // ── 14. Connection API ────────────────────────────────────────────────────
  try {
    if (navigator.connection) {
      def(navigator.connection, 'rtt',           50);
      def(navigator.connection, 'downlink',       10);
      def(navigator.connection, 'effectiveType', '4g');
      def(navigator.connection, 'saveData',       false);
    }
  } catch (_) {}

  // ── 15. Scrub CDP / Playwright / Selenium global leaks ───────────────────
  // These are injected by the automation framework and checked by FingerprintJS.
  for (const key of Object.getOwnPropertyNames(window)) {
    if (/^(cdc_|__playwright|__pw_|__selenium|$cdc_|__webdriver_script)/i.test(key)) {
      try { delete window[key]; } catch (_) {}
    }
  }
  // Run again after short delay to catch late injections
  setTimeout(() => {
    for (const key of Object.getOwnPropertyNames(window)) {
      if (/^(cdc_|__playwright|__pw_|__selenium|$cdc_|__webdriver_script)/i.test(key)) {
        try { delete window[key]; } catch (_) {}
      }
    }
  }, 200);
})();`

// ── Browser / page factory ────────────────────────────────────────────────────

/**
 * Launch a stealth Chromium browser.
 *
 * @param {{ headless?: boolean }} [opts]
 */
export async function createBrowser({ headless = true, executablePath = undefined } = {}) {
  return chromium.launch({
    headless,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--metrics-recording-only',
      '--mute-audio',
      '--safebrowsing-disable-auto-update',
      '--window-size=1280,900',
      '--lang=en-GB,en',
    ],
  })
}

/**
 * Open a new page with the full evasion script injected into every frame.
 *
 * @param {import('playwright').Browser} browser
 */
export async function createPage(browser, { storageState = undefined } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
      'AppleWebKit/537.36 (KHTML, like Gecko) ' +
      'Chrome/124.0.0.0 Safari/537.36',
    storageState,
    extraHTTPHeaders: {
      'Accept-Language': 'en-GB,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
    },
  })

  const page = await ctx.newPage()

  // Inject into the main frame before any page scripts run
  await page.addInitScript(EVASION_SCRIPT)

  // Re-inject into every sub-frame (iframes can leak webdriver through their own context)
  page.on('frameattached', async frame => {
    try { await frame.evaluate(EVASION_SCRIPT) } catch (_) {}
  })

  return page
}

// ── Delay helpers ─────────────────────────────────────────────────────────────

/** @param {number} ms */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Return a random integer in [min, max] inclusive. */
export function jitter(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

// ── Navigation ────────────────────────────────────────────────────────────────

/**
 * Navigate to `url`, returning the response or null on failure.
 *
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {{ timeout?: number, waitFor?: string }} [opts]
 */
export async function navigate(page, url, { timeout = 30_000, waitFor = 'domcontentloaded' } = {}) {
  try {
    return await page.goto(url, { waitUntil: waitFor, timeout })
  } catch (err) {
    console.error(`[navigate] failed → ${url} — ${err.message}`)
    return null
  }
}

// ── Retry wrapper ─────────────────────────────────────────────────────────────

/**
 * Run `fn` up to `retries` times with exponential back-off.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ retries?: number, delay?: number, label?: string }} [opts]
 */
export async function withRetry(fn, { retries = 3, delay = 1_500, label = '' } = {}) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const wait = delay * attempt
      const tag = label ? `[${label}] ` : ''
      if (attempt < retries) {
        console.warn(`${tag}attempt ${attempt}/${retries} failed — retrying in ${wait}ms. ${err.message}`)
        await sleep(wait)
      } else {
        console.error(`${tag}all ${retries} attempts failed. ${err.message}`)
      }
    }
  }
  throw lastError
}
