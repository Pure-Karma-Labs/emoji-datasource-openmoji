/**
 * emoji-datasource-openmoji
 * OpenMoji emoji images compatible with emoji-datasource
 */

const fs = require('fs');
const path = require('path');

const INDIVIDUAL_DIR_128 = path.join(__dirname, 'img/openmoji/128');

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
  const filePath = path.join(INDIVIDUAL_DIR_128, path.basename(image).replace(/\.png$/, '.webp'));
  return fs.existsSync(filePath) ? filePath : null;
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
