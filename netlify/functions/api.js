process.env.DATA_DIR = '/tmp/data';

const fs = require('fs');

function tryRequire(p) { try { return require(p); } catch { return []; } }

const SEED = {
  accounts: tryRequire('../../backend/data/accounts.json'),
  achievement_defs: tryRequire('../../backend/data/achievement_defs.json'),
  achievements: tryRequire('../../backend/data/achievements.json'),
  checkpoints: tryRequire('../../backend/data/checkpoints.json'),
  checkins: tryRequire('../../backend/data/checkins.json'),
  districts: tryRequire('../../backend/data/districts.json'),
  locations: tryRequire('../../backend/data/locations.json'),
  pois: tryRequire('../../backend/data/pois.json'),
  quests: tryRequire('../../backend/data/quests.json'),
  vehicles: tryRequire('../../backend/data/vehicles.json'),
};

const DIR = '/tmp/data';
try {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  for (const [key, data] of Object.entries(SEED)) {
    const p = DIR + '/' + key + '.json';
    if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify(data, null, 2));
  }
} catch (e) {
  console.error('Seed error:', e.message);
}

const serverless = require('serverless-http');
const app = require('../../backend/src/app');

exports.handler = serverless(app);
