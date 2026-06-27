const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (e) {
  console.error('Cannot create DATA_DIR:', DATA_DIR, e.message);
}

// Seed default data files if missing
const SEED_DIR = path.join(__dirname, '..', '..', 'data');
const SEED_FILES = ['accounts.json', 'achievement_defs.json', 'achievements.json', 'checkpoints.json', 'checkins.json', 'districts.json', 'locations.json', 'pois.json', 'quests.json', 'vehicles.json'];
try {
  if (fs.existsSync(SEED_DIR) && DATA_DIR !== SEED_DIR) {
    for (const f of SEED_FILES) {
      const src = path.join(SEED_DIR, f);
      const dst = path.join(DATA_DIR, f);
      if (fs.existsSync(src) && !fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
      }
    }
  }
} catch (e) {
  console.error('Seed copy error:', e.message);
}

function load(collection) {
  const file = path.join(DATA_DIR, `${collection}.json`);
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return []; }
}

function save(collection, data) {
  const file = path.join(DATA_DIR, `${collection}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function findOne(collection, predicate) {
  return load(collection).find(predicate);
}

function findById(collection, id) {
  return load(collection).find(item => item.id === id);
}

function insert(collection, item) {
  const data = load(collection);
  item.id = item.id || (Date.now() + Math.floor(Math.random() * 1000));
  data.push(item);
  save(collection, data);
  return item;
}

function update(collection, id, updates) {
  const data = load(collection);
  const idx = data.findIndex(item => item.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...updates };
  save(collection, data);
  return data[idx];
}

function remove(collection, id) {
  const data = load(collection);
  const idx = data.findIndex(item => item.id === id);
  if (idx === -1) return false;
  data.splice(idx, 1);
  save(collection, data);
  return true;
}

function query(collection, predicate) {
  return load(collection).filter(predicate);
}

module.exports = { load, save, findOne, findById, insert, update, remove, query };
