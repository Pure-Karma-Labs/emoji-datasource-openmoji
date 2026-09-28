#!/usr/bin/env node
// Copyright 2025 Signal Messenger, LLC
// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Generate OpenMoji emoji images compatible with emoji-datasource
 *
 * This script reads emoji-datasource for grid positions and image names,
 * loads the corresponding OpenMoji SVGs, and generates:
 *   - img/sheets/{32,64}.webp  sprite sheets on emoji-datasource's 62x62 grid
 *   - img/openmoji/128/*.webp  one full-resolution image per emoji (including
 *                              skin tone variants), named after emoji-datasource's
 *                              `image` field
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const GRID_SIZE = 62; // 62x62 grid as used by emoji-datasource
const EMOJI_SIZES = [32, 64]; // Generate both 32px and 64px sprite sheets
const MARGIN = 1; // 1px margin around each emoji
const INDIVIDUAL_SIZE = 128; // Per-emoji image size
const CONCURRENCY = 16;

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const WEBP_OPTIONS = { quality: 80, alphaQuality: 100, effort: 6 };

async function main() {
  console.log('🎨 Building OpenMoji emoji images...\n');

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

  await generateIndividualImages(emojiData, openmojiDir, INDIVIDUAL_SIZE);

  console.log('\n✅ OpenMoji emoji images generated successfully!');
}

// Try multiple filename formats for OpenMoji
function resolveSvgPath(openmojiDir, unified, nonQualified) {
  const possibleFilenames = [
    `${unified}.svg`,
    `${unified.replace(/-FE0F/g, '')}.svg`, // without variation selector
    `${nonQualified || ''}.svg`, // non-qualified version
  ].filter(f => f && f !== '.svg');

  for (const filename of possibleFilenames) {
    const testPath = path.join(openmojiDir, filename);
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }
  return null;
}

// Base emojis followed by their skin tone variations, flattened
function allEntries(emojiData) {
  const entries = [];
  for (const emoji of emojiData) {
    entries.push({ ...emoji, isVariation: false });
    for (const variation of Object.values(emoji.skin_variations || {})) {
      entries.push({ ...variation, isVariation: true });
    }
  }
  return entries;
}

// Bounded-concurrency promise pool
async function poolMap(items, concurrency, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function renderSvg(svgPath, size) {
  return sharp(svgPath).resize(size, size, { fit: 'contain', background: TRANSPARENT });
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
      background: TRANSPARENT
    }
  });

  const entries = allEntries(emojiData).filter(
    e => e.sheet_x !== undefined && e.sheet_y !== undefined
  );

  let found = 0;
  let skinToneVariants = 0;
  let missing = 0;

  const composites = await poolMap(entries, CONCURRENCY, async (entry) => {
    const svgPath = resolveSvgPath(openmojiDir, entry.unified, entry.non_qualified);
    if (!svgPath) {
      missing++;
      return null;
    }

    try {
      const input = await renderSvg(svgPath, emojiSize).png().toBuffer();
      if (entry.isVariation) {
        skinToneVariants++;
      } else {
        found++;
      }
      return {
        input,
        top: (entry.sheet_y * cellSize) + MARGIN,
        left: (entry.sheet_x * cellSize) + MARGIN
      };
    } catch (error) {
      console.warn(`⚠️  Failed to process ${entry.unified}:`, error.message);
      missing++;
      return null;
    }
  });

  console.log(`  ✓ Found ${found} base emojis + ${skinToneVariants} skin tone variants`);
  if (missing > 0) {
    console.log(`  ⚠ Skipped ${missing} emojis (may be Apple-specific or missing from OpenMoji)`);
  }

  // Composite all emojis onto canvas
  const outputPath = path.join(__dirname, `../img/sheets/${emojiSize}.webp`);
  const placed = composites.filter(Boolean);

  console.log(`  📦 Compositing ${placed.length} emojis...`);

  await canvas
    .composite(placed)
    .webp(WEBP_OPTIONS)
    .toFile(outputPath);

  const stats = fs.statSync(outputPath);
  console.log(`  ✅ Saved ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function generateIndividualImages(emojiData, openmojiDir, size) {
  console.log(`\n🖼  Generating ${size}px individual images...`);

  const outputDir = path.join(__dirname, `../img/openmoji/${size}`);

  // Wipe and recreate output directory for idempotency
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const entries = allEntries(emojiData)
    .filter(e => e.image)
    .sort((a, b) => a.image.localeCompare(b.image));

  let generated = 0;
  const missingBase = [];
  const missingVariations = [];

  await poolMap(entries, CONCURRENCY, async (entry) => {
    const svgPath = resolveSvgPath(openmojiDir, entry.unified, entry.non_qualified);
    if (!svgPath) {
      (entry.isVariation ? missingVariations : missingBase).push(entry.unified);
      return;
    }

    const filename = entry.image.replace(/\.png$/, '.webp');
    await renderSvg(svgPath, size)
      .webp(WEBP_OPTIONS)
      .toFile(path.join(outputDir, filename));
    generated++;
  });

  const files = fs.readdirSync(outputDir);
  const totalBytes = files.reduce((sum, f) => sum + fs.statSync(path.join(outputDir, f)).size, 0);
  console.log(`  ✓ Generated ${generated} images (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);

  if (missingVariations.length > 0) {
    console.log(`  ⚠ Skipped ${missingVariations.length} skin tone variants: ${missingVariations.join(', ')}`);
  }

  // Every base emoji must resolve to an OpenMoji SVG
  if (missingBase.length > 0) {
    console.error(`❌ ${missingBase.length} base emojis have no OpenMoji SVG: ${missingBase.join(', ')}`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
