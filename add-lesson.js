#!/usr/bin/env node
/**
 * add-lesson.js — Adds a new lesson to the HD Guru static site
 * 
 * Usage: node add-lesson.js
 * 
 * What it does:
 * 1. Reads current data.js to find the highest lesson ID
 * 2. Picks the next lesson from content-pool.js
 * 3. Adds the new lesson card to index.html (cards grid)
 * 4. Appends the lesson data to data.js
 * 5. Updates sitemap.xml
 * 6. Commits and pushes to GitHub
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load existing data.js to find current max ID ──────────────────
const dataPath = path.join(__dirname, 'data.js');
const htmlPath = path.join(__dirname, 'index.html');
const sitemapPath = path.join(__dirname, 'sitemap.xml');
const poolPath   = path.join(__dirname, 'content-pool.js');

const dataContent = fs.readFileSync(dataPath, 'utf8');

// Find all lesson IDs via regex
const idMatches = [...dataContent.matchAll(/id:\s*(\d+),/g)].map(m => parseInt(m[1]));
const currentMaxId = Math.max(...idMatches);
const nextId = currentMaxId + 1;

console.log(`Current max lesson ID: ${currentMaxId}`);
console.log(`Next lesson ID: ${nextId}`);

// ── Load content pool ───────────────────────────────────────────────
const { contentPool } = await import('./content-pool.js');

// Find next available lesson (not already used)
const usedIds = new Set(idMatches);
const available = contentPool.filter(l => !usedIds.has(l.id));

if (available.length === 0) {
  console.error('No more lessons in pool! Resetting...');
  process.exit(1);
}

const lesson = available[0];
console.log(`\nPicking lesson: "${lesson.title}" (Pool ID ${lesson.id})`);

// ── Idempotency: prevent double-run ─────────────────────────────────
// Read HTML once for the check
const htmlContentCheck = fs.readFileSync(htmlPath, 'utf8');
// Check 1: data.js already has this lesson?
if (usedIds.has(nextId)) {
  console.log(`⚠️  Lesson ${nextId} already in data.js — skipping (idempotency check).`);
  process.exit(0);
}
// Check 2: HTML already has the card?
if (htmlContentCheck.includes(`data-lesson-id="${nextId}"`)) {
  console.log(`⚠️  Lesson ${nextId} already in HTML — skipping (idempotency check).`);
  process.exit(0);
}

// ── Build the card HTML ──────────────────────────────────────────────
const cardHtml = `
          <div class="card-wrapper" data-lesson-id="${nextId}">
            <div class="card-inner">
              <div class="card-face card-front">
                <div class="card-back-design">
                  <span class="lesson-badge">Lektion ${nextId}</span>
                  <span class="card-icon">${lesson.icon}</span>
                  <h2 class="card-title">${lesson.title}</h2>
                  <p class="card-subtitle">${lesson.subtitle}</p>
                  <span class="flip-hint">Tippe zum Öffnen</span>
                </div>
              </div>
            </div>
          </div>`;

// ── Inject card into index.html ─────────────────────────────────────
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Find the closing </div> of the cards-grid (before </main>)
// We insert before the last card-wrapper closing div
// Look for the last occurrence of </div> that closes a card-wrapper
const insertMarker = '        </div>\n      </main>';
if (!htmlContent.includes(insertMarker)) {
  console.error('Could not find insertion point in HTML!');
  process.exit(1);
}

const newCardBlock = cardHtml + '\n' + insertMarker;
htmlContent = htmlContent.replace(insertMarker, newCardBlock);
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('✓ Updated index.html with new card');

// ── Append lesson data to data.js ──────────────────────────────────
const lessonEntry = `  {
    id: ${nextId},
    day: ${nextId},
    title: "${lesson.title}",
    subtitle: "${lesson.subtitle}",
    teaser: "${lesson.teaser}",
    icon: "${lesson.icon}",
    content: \`${lesson.content}\`
  }`;

// Find the closing ] of the lessons array
// Find the last closing bracket of the lessons array
// The array ends with: ];
// We need to: add comma after last entry, then add new entry, then ];
const lastClosing = '];';
const lastIdx = dataContent.lastIndexOf(lastClosing);
if (lastIdx === -1) {
  console.error('Could not find end of lessons array in data.js!');
  process.exit(1);
}

// The character right before ]; should be } from the last entry
// We need to add a comma after it, then the new entry
const beforeBracket = lastIdx; // index of ]
// Find the } of the last entry (it's right before \n];)
const insertPoint = lastIdx; // ] goes here, but we need to inject before it
// Replace ]; with ,\n  <new entry>  \n];
const newDataContent = dataContent.slice(0, lastIdx) + ',\n' + lessonEntry + '\n];';
fs.writeFileSync(dataPath, newDataContent, 'utf8');
console.log('✓ Updated data.js with new lesson');

// ── Update sitemap.xml ──────────────────────────────────────────────
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
const today = new Date().toISOString().split('T')[0];
const newUrl = `  <url>\n    <loc>https://humandesignguru.netlify.app/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n  </url>`;
// sitemap is just a reference, no per-lesson URLs needed for SPA-style
// Just update lastmod of the main URL
sitemap = sitemap.replace(
  /<lastmod>.*<\/lastmod>/,
  `<lastmod>${today}</lastmod>`
);
fs.writeFileSync(sitemapPath, sitemap, 'utf8');
console.log('✓ Updated sitemap.xml');

// ── Git commit & push ──────────────────────────────────────────────
try {
  execSync('git add -A', { cwd: __dirname });
  const commitMsg = `Day ${nextId}: ${lesson.title} — ${lesson.subtitle}`;
  execSync(`git commit -m "${commitMsg}"`, { cwd: __dirname });
  console.log(`✓ Git committed: "${commitMsg}"`);
  
  execSync('git push origin main', { cwd: __dirname });
  console.log('✓ Pushed to GitHub');
} catch (e) {
  console.error('Git error:', e.stderr?.toString() || e.message);
  console.log('Files updated locally but push failed. Run git push manually.');
}

// ── Summary ─────────────────────────────────────────────────────────
console.log(`\n🎉 Lesson ${nextId} added: "${lesson.title}"`);
console.log(`    Pool remaining: ${available.length - 1} lessons`);
console.log(`    Next pool lesson: "${contentPool.find(l => !usedIds.has(l.id) && l.id !== lesson.id)?.title || 'last one!'}"`);
