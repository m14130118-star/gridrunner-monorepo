process.env.DATA_DIR = '/tmp/data';

const fs = require('fs');
const path = require('path');

const DIR = '/tmp/data';
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

// Seed from bundled data files inside the function directory
const DATA_SRC = path.join(__dirname, 'data');
const FILES = ['accounts.json','achievement_defs.json','achievements.json','checkpoints.json','checkins.json','districts.json','locations.json','pois.json','quests.json','vehicles.json'];
if (fs.existsSync(DATA_SRC)) {
  for (const f of FILES) {
    const src = path.join(DATA_SRC, f);
    const dst = path.join(DIR, f);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
    }
  }
} else {
  // Fallback: try to require from backend/data
  try {
    const fallback = path.join(__dirname, '..', '..', 'backend', 'data');
    if (fs.existsSync(fallback)) {
      for (const f of FILES) {
        const src = path.join(fallback, f);
        const dst = path.join(DIR, f);
        if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
      }
    }
  } catch {}
}

// Ensure empty data files exist for collections not yet created
for (const f of FILES) {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) fs.writeFileSync(p, '[]');
}

const serverless = require('serverless-http');
const app = require('../../backend/src/app');

exports.handler = serverless(app);
