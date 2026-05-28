# HD Guru Static — Agents

## Project

A German-language Human Design static site. Content is served via `index.html` (SPA-style cards grid), backed by lesson data in `data.js` and a lesson pool in `content-pool.js`. No build step. No tests or linting.

## Content Workflow

Adding a daily lesson:

```bash
node add-lesson.js
```

What happens:
1. Reads `data.js` → finds highest lesson ID
2. Takes the next unused lesson from `content-pool.js`
3. Injects card HTML into `index.html`
4. Appends lesson data to `data.js`
5. Updates `sitemap.xml`
6. **Commits and pushes to GitHub automatically**

If the script fails mid-step, check `data.js` and `index.html` for duplicate lesson IDs — the script has idempotency guards but manual cleanup may be needed.

**Recovery if mid-fail:** Re-run the script — idempotency guards will skip already-added lessons. If duplicates exist, manually remove the last card block from `index.html` and the last entry from `data.js` before re-running.

## Files

- `index.html` — manual edits will be overwritten; use `node add-lesson.js`
- `data.js` — lesson entries (id, day, title, subtitle, teaser, icon, content)
- `content-pool.js` — unused lesson pool; next lessons come from here
- `add-lesson.js` — the content management script (auto-commits/pushes)
- `netlify/functions/pageviews.js` — Netlify Function, not a local script
- `stats/pageviews.json` — persisted JSON store, not a database

## Netlify

- Site: https://humandesignguru.netlify.app
- `netlify/functions/pageviews.js` is a Netlify Function, not a local script
- `stats/pageviews.json` is the persisted store (JSON file, not a DB)

## Key Constraint

`add-lesson.js` **auto-commits and pushes** on success. Run it only when you intend to publish.

## No Build / No Tests

There is no `npm run dev`, no test suite, no linter, no typecheck. Only:
- Static file serving (any HTTP server works)
- `node add-lesson.js` to add content
