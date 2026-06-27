process.env.DATA_DIR = '/tmp/data';

const fs = require('fs');
const path = require('path');

// Seed data files using require() so the bundler includes them
const DATA_SRC = path.join(__dirname, 'data');
const FILES = ['achievement_defs.json', 'districts.json', 'pois.json', 'vehicles.json'];

const DIR = '/tmp/data';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

for (const f of FILES) {
  const dst = path.join(DIR, f);
  if (!fs.existsSync(dst)) {
    const src = path.join(DATA_SRC, f);
    try {
      const data = require(src);
      fs.writeFileSync(dst, JSON.stringify(data, null, 2));
    } catch {
      fs.writeFileSync(dst, '[]');
    }
  }
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
