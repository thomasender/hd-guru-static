const { execSync } = require('child_process');
const fs = require('fs');

const STATS_FILE = 'stats/pageviews.json';
const COMMIT_MSG = 'chore: increment pageview counter';

exports.handler = async function (event) {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Pull latest
    execSync('git pull origin main --no-edit', { stdio: 'pipe' });

    // Read current count
    let data = { count: 0 };
    if (fs.existsSync(STATS_FILE)) {
      const raw = fs.readFileSync(STATS_FILE, 'utf8');
      data = JSON.parse(raw);
    }

    // Increment
    data.count += 1;

    // Write back
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2));

    // Commit & push
    execSync('git add stats/pageviews.json', { stdio: 'pipe' });
    execSync(`git commit -m "${COMMIT_MSG}"`, { stdio: 'pipe' });
    execSync('git push origin main', { stdio: 'pipe' });

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: data.count }),
    };
  } catch (err) {
    console.error('pageview error:', err.message);
    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 0, error: err.message }),
    };
  }
};