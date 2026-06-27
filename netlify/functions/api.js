process.env.DATA_DIR = '/tmp/data';

const fs = require('fs');
const path = require('path');

const DIR = '/tmp/data';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

// Seed from bundled JS module (forces bundler inclusion)
try {
  const seed = require('./lib/seed');
  for (const [key, data] of Object.entries(seed)) {
    const p = path.join(DIR, key + '.json');
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(data, null, 2));
  }
} catch (e) {
  console.error('Seed error:', e.message);
}

// Ensure mutable data files exist as empty arrays
const MUTABLE = ['accounts.json', 'achievements.json', 'checkpoints.json', 'checkins.json', 'locations.json', 'quests.json'];
for (const f of MUTABLE) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]');
}

const serverless = require('serverless-http');
const app = require('../../backend/src/app');

exports.handler = serverless(app);
