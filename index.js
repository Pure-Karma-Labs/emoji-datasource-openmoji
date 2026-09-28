/**
 * emoji-datasource-openmoji
 * OpenMoji emoji images compatible with emoji-datasource
 *
 * This entry point is for Node. Bundlers (webpack, Metro, Vite) should import
 * the image files directly, e.g.
 * `emoji-datasource-openmoji/img/openmoji/128/1f600.webp`.
 */

const INDIVIDUAL_DIR_128 = `${__dirname}/img/openmoji/128`;

let individualFiles = null;

/**
 * Resolve the 128px image for an emoji-datasource entry.
 *
 * @param {string} image - The entry's `image` field, e.g. '1f600.png'
 *   (skin tone variants have their own `image`, e.g. '1f44b-1f3fb.png').
 * @returns {string|null} Absolute path to the .webp file, or null if absent.
 */
function imagePath(image) {
  if (typeof image !== 'string') {
    return null;
  }
  const path = require('path');
  // The directory is fixed at publish time, so list it once.
  if (individualFiles === null) {
    individualFiles = new Set(require('fs').readdirSync(INDIVIDUAL_DIR_128));
  }
  const filename = path.basename(image).replace(/\.png$/, '.webp');
  return individualFiles.has(filename) ? path.join(INDIVIDUAL_DIR_128, filename) : null;
}

module.exports = {
  sheets: {
    '32': require.resolve('./img/sheets/32.webp'),
    '64': require.resolve('./img/sheets/64.webp'),
  },
  // Convenience aliases
  sheet32: require.resolve('./img/sheets/32.webp'),
  sheet64: require.resolve('./img/sheets/64.webp'),
  // One image per emoji, named after emoji-datasource's `image` field
  individual: {
    '128': INDIVIDUAL_DIR_128,
  },
  imagePath,
};
