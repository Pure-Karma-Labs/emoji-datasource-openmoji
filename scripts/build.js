#!/usr/bin/env node
// Copyright 2025 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Generate OpenMoji sprite sheets for emoji picker
 *
 * This script reads emoji-datasource to get grid positions,
 * loads corresponding OpenMoji SVGs, and generates sprite sheets
 * matching Signal's 62x62 grid layout.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GRID_SIZE = 62; // 62x62 grid as used by Signal
const EMOJI_SIZES = [32, 64]; // Generate both 32px and 64px sprite sheets
const MARGIN = 1; // 1px margin around each emoji

async function main() {
  console.log('🎨 Building OpenMoji sprite sheets...\n');

  // Load emoji data
  const emojiDataPath = path.join(__dirname, '../node_modules/emoji-datasource/emoji.json');
  const emojiData = JSON.parse(fs.readFileSync(emojiDataPath, 'utf8'));

  console.log(`📊 Loaded ${emojiData.length} emojis from emoji-datasource`);

  // OpenMoji SVG directory
  const openmojiDir = path.join(__dirname, '../node_modules/openmoji/color/svg');

  if (!fs.existsSync(openmojiDir)) {
    console.error('❌ OpenMoji directory not found:', openmojiDir);
    process.exit(1);
  }

  // Generate sprite sheets for each size
  for (const size of EMOJI_SIZES) {
    await generateSpriteSheet(emojiData, openmojiDir, size);
  }

  console.log('\n✅ OpenMoji sprite sheets generated successfully!');
}

async function generateSpriteSheet(emojiData, openmojiDir, emojiSize) {
  console.log(`\n📐 Generating ${emojiSize}px sprite sheet...`);

  const cellSize = emojiSize + (MARGIN * 2);
  const canvasSize = cellSize * GRID_SIZE;

  console.log(`  Canvas size: ${canvasSize}x${canvasSize} (${GRID_SIZE}x${GRID_SIZE} grid, ${cellSize}px cells)`);

  // Create blank canvas
  const canvas = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Collect all emoji composites
  const composites = [];
  let found = 0;
  let missing = 0;
  let skinToneVariants = 0;

  // Helper function to process a single emoji
  async function processEmoji(unified, sheet_x, sheet_y, nonQualified) {
    if (sheet_x === undefined || sheet_y === undefined) {
      return false;
    }

    // Try multiple filename formats for OpenMoji
    const possibleFilenames = [
      `${unified}.svg`,
      `${unified.replace(/-FE0F/g, '')}.svg`, // without variation selector
      `${nonQualified || ''}.svg`, // non-qualified version
    ].filter(f => f && f !== '.svg');

    let svgPath = null;
    for (const filename of possibleFilenames) {
      const testPath = path.join(openmojiDir, filename);
      if (fs.existsSync(testPath)) {
        svgPath = testPath;
        break;
      }
    }

    if (!svgPath) {
      return false;
    }

    try {
      // Load and resize SVG
      const svgBuffer = await sharp(svgPath)
        .resize(emojiSize, emojiSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toBuffer();

      // Calculate position in sprite sheet
      const x = (sheet_x * cellSize) + MARGIN;
      const y = (sheet_y * cellSize) + MARGIN;

      composites.push({
        input: svgBuffer,
        top: y,
        left: x
      });

      return true;
    } catch (error) {
      console.warn(`⚠️  Failed to process ${unified}:`, error.message);
      return false;
    }
  }

  // Process all emojis
  for (const emoji of emojiData) {
    // Process base emoji
    const processed = await processEmoji(
      emoji.unified,
      emoji.sheet_x,
      emoji.sheet_y,
      emoji.non_qualified
    );

    if (processed) {
      found++;
    } else if (emoji.sheet_x !== undefined && emoji.sheet_y !== undefined) {
      missing++;
    }

    // Process skin tone variations
    if (emoji.skin_variations) {
      for (const [skinTone, variation] of Object.entries(emoji.skin_variations)) {
        const varProcessed = await processEmoji(
          variation.unified,
          variation.sheet_x,
          variation.sheet_y,
          variation.non_qualified
        );

        if (varProcessed) {
          skinToneVariants++;
        } else if (variation.sheet_x !== undefined && variation.sheet_y !== undefined) {
          missing++;
        }
      }
    }
  }

  console.log(`  ✓ Found ${found} base emojis + ${skinToneVariants} skin tone variants`);
  if (missing > 0) {
    console.log(`  ⚠ Skipped ${missing} emojis (may be Apple-specific or missing from OpenMoji)`);
  }

  // Composite all emojis onto canvas
  const outputPath = path.join(__dirname, `../img/sheets/${emojiSize}.webp`);

  console.log(`  📦 Compositing ${composites.length} emojis...`);

  await canvas
    .composite(composites)
    .webp({ quality: 75, alphaQuality: 20, effort: 6 })
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`  ✅ Saved ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
