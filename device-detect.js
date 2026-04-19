/**
 * device-detect.js
 *
 * Standalone device and network-connection detection utility.
 * No external dependencies. Works in browsers and Node.js (graceful degradation).
 *
 * Exports:
 *   detectDevice()   — snapshot of the current device/network state
 *   onChange(fn)     — subscribe to live network-condition changes
 */

/* -------------------------------------------------------------------------- */
/*  Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/** @type {string} Normalised lower-case user-agent string. */
const UA = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
const UA_lc = UA.toLowerCase();

/**
 * Test one or more patterns against the user-agent string.
 *
 * @param {...(string|RegExp)} patterns
 * @returns {boolean}
 */
function uaMatch(...patterns) {
  return patterns.some(p =>
    p instanceof RegExp ? p.test(UA) : UA_lc.includes(p.toLowerCase())
  );
}

/**
 * Safely call window.matchMedia and return the result.
 * Returns null when the API is unavailable (SSR, old browsers).
 *
 * @param {string} query  CSS media query string.
 * @returns {MediaQueryList|null}
 */
function mq(query) {
  try {
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query)
      : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  OS detection                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Derive the operating system from the user-agent string and platform hints.
 *
 * Priority: Tizen → webOS → Android → iOS → Windows → macOS → Linux → unknown.
 *
 * @returns {'tizen'|'webos'|'android'|'ios'|'windows'|'macos'|'linux'|'unknown'}
 */
function detectOS() {
  // Samsung Smart TV (Tizen)
  if (uaMatch('tizen')) return 'tizen';

  // LG Smart TV (webOS)
  if (uaMatch('web0s', 'webos', /webos/i)) return 'webos';

  // Android (must come before Linux, since Android UAs also contain "Linux")
  if (uaMatch('android')) return 'android';

  // iOS — iPhones/iPads with iOS 13+ report "Macintosh" but expose touch points
  if (
    uaMatch('iphone', 'ipad', 'ipod') ||
    (typeof navigator !== 'undefined' &&
      /macintosh/i.test(UA) &&
      navigator.maxTouchPoints > 1)
  ) return 'ios';

  // Windows (desktop & Xbox)
  if (uaMatch('windows')) return 'windows';

  // macOS desktop
  if (uaMatch('macintosh', 'mac os x')) return 'macos';

  // Generic Linux desktop
  if (uaMatch('linux')) return 'linux';

  return 'unknown';
}

/* -------------------------------------------------------------------------- */
/*  Touch / pointer capability                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Detect whether the primary input is a touch surface.
 *
 * Combines event support, navigator touch-point count, and CSS pointer media
 * queries to minimise false positives on hybrid devices.
 *
 * @returns {boolean}
 */
function detectTouchDevice() {
  if (typeof window === 'undefined') return false;

  const hasTouch =
    'ontouchstart' in window ||
    (typeof navigator !== 'undefined' && (
      navigator.maxTouchPoints > 0 ||
      /** @type {any} */ (navigator).msMaxTouchPoints > 0
    ));

  // A coarse primary pointer strongly implies a touch device.
  const coarsePointer = mq('(pointer: coarse)')?.matches ?? false;

  return hasTouch || coarsePointer;
}

/**
 * Detect whether a fine pointing device (mouse or trackpad) is available.
 *
 * Uses the `pointer: fine` media feature; falls back to checking whether
 * any hover capability is present.
 *
 * @returns {boolean}
 */
function detectMousePointer() {
  // `pointer: fine` = mouse / trackpad precision input
  if (mq('(pointer: fine)')?.matches) return true;

  // `any-pointer: fine` catches fine secondary inputs on hybrid devices
  if (mq('(any-pointer: fine)')?.matches) return true;

  return false;
}

/* -------------------------------------------------------------------------- */
/*  Device-type detection                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Classify the device into one of four categories.
 *
 * Detection priority: **TV → phone → tablet → desktop**
 *
 * TV heuristics:
 *   - User-agent contains known Smart TV identifiers (Tizen, webOS, HbbTV, BRAVIA, etc.)
 *   - OR: very large screen + no touch capability + pixel ratio of exactly 1
 *     (typical of a 1080 p / 4 K television with a standard non-HiDPI display)
 *
 * Phone / tablet boundary: 768 CSS px on the shortest screen axis.
 *
 * @param {{
 *   os: string,
 *   isTouchDevice: boolean,
 *   screenWidth: number,
 *   screenHeight: number,
 *   pixelRatio: number
 * }} info  Partially-constructed device info object.
 * @returns {'tv'|'phone'|'tablet'|'desktop'}
 */
function detectType({ os, isTouchDevice, screenWidth, screenHeight, pixelRatio }) {
  /* ── Smart TV ── */
  const tvUA = uaMatch(
    'tizen',       // Samsung
    'web0s',       // LG
    'webos',       // LG (alternate capitalisation)
    'hbbtv',       // HbbTV standard (used by many European broadcasters)
    'bravia',      // Sony BRAVIA
    'netcast',     // LG NetCast (older)
    'viera',       // Panasonic Viera
    'smart-tv',
    'smarttv',
    'googletv',
    /\bcrkey\b/i,  // Chromecast
    /\baftt\b/i,   // Amazon Fire TV stick
    /\bafts\b/i,   // Amazon Fire TV
    /xbox/i,       // Xbox (runs Windows but is TV-connected)
    /playstation\s*[345]/i // PlayStation (TV-connected console)
  );

  // Screen dimensions in CSS pixels — use the shorter axis as "width" when rotated
  const shortAxis = Math.min(screenWidth, screenHeight);
  const longAxis  = Math.max(screenWidth, screenHeight);

  // "TV-like" screen: very wide, no touch, DPR of 1 (non-HiDPI panel)
  const tvScreen = longAxis >= 1280 && !isTouchDevice && pixelRatio === 1 && shortAxis >= 600;

  if (tvUA || (tvScreen && os !== 'windows' && os !== 'macos' && os !== 'linux')) {
    return 'tv';
  }

  /* ── Phone ── */
  // The shortest screen axis < 768 CSS px is the conventional phone boundary.
  // Android/iOS "Mobile" UA token is also a reliable signal.
  const mobileUA = uaMatch('mobile', 'iphone', 'ipod');

  if (isTouchDevice && (shortAxis < 768 || mobileUA)) {
    return 'phone';
  }

  /* ── Tablet ── */
  // Touch device with a larger screen (iPad, large Android tablet).
  if (isTouchDevice) {
    return 'tablet';
  }

  /* ── Desktop ── */
  return 'desktop';
}

/* -------------------------------------------------------------------------- */
/*  Network / connection detection                                             */
/* -------------------------------------------------------------------------- */

/**
 * Retrieve the Network Information API object, normalising vendor prefixes.
 *
 * @returns {NetworkInformation|null}
 */
function getConnection() {
  if (typeof navigator === 'undefined') return null;
  return /** @type {any} */ (navigator).connection ||
         /** @type {any} */ (navigator).mozConnection ||
         /** @type {any} */ (navigator).webkitConnection ||
         null;
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {Object} DeviceInfo
 * @property {'tv'|'phone'|'tablet'|'desktop'}                   type         - Device category.
 * @property {'android'|'ios'|'windows'|'macos'|'linux'|'tizen'|'webos'|'unknown'} os - Operating system.
 * @property {boolean}  isTouchDevice  - True when a touch surface is the primary input.
 * @property {boolean}  hasMousePointer - True when a fine pointer (mouse/trackpad) is available.
 * @property {number}   screenWidth    - Physical screen width in CSS pixels (screen.width).
 * @property {number}   screenHeight   - Physical screen height in CSS pixels (screen.height).
 * @property {number}   pixelRatio     - Device pixel ratio (window.devicePixelRatio).
 * @property {'slow-2g'|'2g'|'3g'|'4g'|'unknown'} connectionType - Effective network type.
 * @property {number|null} downlink    - Estimated downlink speed in Mbps, or null if unavailable.
 * @property {boolean}  saveData       - True when the user has requested reduced data usage.
 */

/**
 * Capture a snapshot of the current device and network state.
 *
 * All values are read at call time — call this function again if you need
 * updated screen dimensions after an orientation change, or use {@link onChange}
 * to react to network changes automatically.
 *
 * @returns {DeviceInfo}
 *
 * @example
 * import { detectDevice } from './device-detect.js';
 *
 * const info = detectDevice();
 * if (info.type === 'tv') {
 *   enableLeanBackUI();
 * }
 * if (info.connectionType === 'slow-2g' || info.saveData) {
 *   disableAutoplay();
 * }
 */
export function detectDevice() {
  const conn         = getConnection();
  const isTouchDevice  = detectTouchDevice();
  const hasMousePointer = detectMousePointer();
  const pixelRatio   = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
  const screenWidth  = (typeof screen !== 'undefined' && screen.width)  || 0;
  const screenHeight = (typeof screen !== 'undefined' && screen.height) || 0;
  const os           = detectOS();

  const type = detectType({ os, isTouchDevice, screenWidth, screenHeight, pixelRatio });

  return {
    type,
    os,
    isTouchDevice,
    hasMousePointer,
    screenWidth,
    screenHeight,
    pixelRatio,
    connectionType: (conn?.effectiveType) ?? 'unknown',
    downlink:       (conn?.downlink      != null) ? conn.downlink : null,
    saveData:       (conn?.saveData)     ?? false,
  };
}

/**
 * Subscribe to live network-condition changes.
 *
 * The callback receives a fresh {@link DeviceInfo} snapshot every time the
 * browser's Network Information API fires a `change` event. Returns an
 * unsubscribe function that removes the listener.
 *
 * If the Network Information API is unavailable the callback is never invoked
 * and the returned function is a no-op.
 *
 * @param {function(DeviceInfo): void} callback  Called on each network change.
 * @returns {function(): void}  Call to stop listening.
 *
 * @example
 * import { onChange } from './device-detect.js';
 *
 * const unsubscribe = onChange(info => {
 *   console.log('Network changed:', info.connectionType, info.downlink + ' Mbps');
 *   if (info.connectionType === 'slow-2g') pauseAllStreams();
 * });
 *
 * // Later, when no longer needed:
 * unsubscribe();
 */
export function onChange(callback) {
  const conn = getConnection();
  if (!conn) return () => {};

  /** @param {Event} _e */
  function handler(_e) {
    callback(detectDevice());
  }

  conn.addEventListener('change', handler);

  return function unsubscribe() {
    conn.removeEventListener('change', handler);
  };
}

/* -------------------------------------------------------------------------- */
/*  CommonJS / UMD compatibility shim                                         */
/*  Allows `const { detectDevice } = require('./device-detect.js')` in Node  */
/* -------------------------------------------------------------------------- */

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectDevice, onChange };
}
