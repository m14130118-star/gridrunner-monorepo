const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

const uri = process.env.MONGODB_URI;

// Persistence directory for in-memory mode.
// Serverless platforms (Netlify, Vercel) only allow writes to /tmp.
const PERSIST_DIR = (process.env.NETLIFY || process.env.VERCEL)
  ? '/tmp/gridrunner-data'
  : path.join(__dirname, '..', '..', 'data', 'persist');
const memoryDb = {};

function persistPath(collection) {
  return path.join(PERSIST_DIR, `${collection}.json`);
}

function loadPersisted(collection) {
  try {
    const p = persistPath(collection);
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      if (raw.trim()) return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`[db] Failed to load persisted ${collection}:`, e.message);
  }
  return null;
}

function savePersisted(collection) {
  try {
    if (!fs.existsSync(PERSIST_DIR)) fs.mkdirSync(PERSIST_DIR, { recursive: true });
    fs.writeFileSync(persistPath(collection), JSON.stringify(memoryDb[collection] || []), 'utf8');
  } catch (e) {
    console.warn(`[db] Failed to persist ${collection}:`, e.message);
  }
}

// Preload seed data for in-memory mode.
// Runs even when MONGODB_URI is set: memory is the hot fallback if Atlas
// is unreachable (e.g. IP allowlist), so it must hold zones/factions too.
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
{
  // Try loading persisted data first
  const persistedCollections = ['accounts', 'factions', 'zones', 'payment_sessions', 'achievements', 'checkpoints', 'checkins', 'locations', 'quests', 'traps', 'pois'];
  let hasData = false;
  for (const col of persistedCollections) {
    const data = loadPersisted(col);
    if (data && data.length > 0) {
      memoryDb[col] = data;
      hasData = true;
    }
  }

  if (!hasData) {
    // Seed fresh
    if (fs.existsSync(path.join(DATA_DIR, 'zones.json'))) {
      try {
        memoryDb.zones = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'zones.json'), 'utf8'));
        savePersisted('zones');
        console.log(`[db] Preloaded ${memoryDb.zones.length} zones`);
      } catch (e) {
        console.warn('[db] Failed to load zones seed:', e.message);
      }
    }
    if (!memoryDb.factions || memoryDb.factions.length === 0) {
      const defaultFactions = [
        { id: 'faction_red', name: 'Красные Драконы', color: '#ff1744', memberIds: [], treasury: 0, createdAt: new Date().toISOString() },
        { id: 'faction_blue', name: 'Синие Акулы', color: '#2979ff', memberIds: [], treasury: 0, createdAt: new Date().toISOString() },
        { id: 'faction_green', name: 'Зелёные Волки', color: '#00e676', memberIds: [], treasury: 0, createdAt: new Date().toISOString() },
      ];
      memoryDb.factions = defaultFactions;
      savePersisted('factions');
      console.log(`[db] Seeded ${defaultFactions.length} default factions`);
    }
  } else {
    console.log(`[db] Loaded ${Object.keys(memoryDb).reduce((s, c) => s + memoryDb[c].length, 0)} records from persistence`);
  }
}

async function getMemCol(collection) {
  if (!memoryDb[collection]) memoryDb[collection] = [];
  return memoryDb[collection];
}

function pointInPolygon(lng, lat, polygon) {
  let inside = false;
  const coords = polygon.type === 'Polygon' ? polygon.coordinates[0] : polygon.coordinates[0][0];
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0], yi = coords[i][1];
    const xj = coords[j][0], yj = coords[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function memMatch(item, predicate) {
  if (!predicate) return true;
  if (typeof predicate === 'object') {
    return Object.entries(predicate).every(([k, v]) => {
      if (k === '$or') return v.some(cond => memMatch(item, cond));
      if (k === '$geoIntersects') {
        if (!v?.$geometry) return false;
        const coords = v.$geometry.coordinates;
        const target = item.type === 'Polygon' ? item : (item.geometry || item);
        if (v.$geometry.type === 'Point') return pointInPolygon(coords[0], coords[1], target);
        return false;
      }
      if (typeof v === 'object' && v.$regex) {
        return new RegExp(v.$regex, v.$options || '').test(item[k]);
      }
      if (typeof v === 'object' && v.$ne) {
        return item[k] !== v.$ne;
      }
      if (typeof v === 'object' && v !== null && ('$lt' in v || '$lte' in v || '$gt' in v || '$gte' in v || '$in' in v)) {
        const val = item[k];
        if ('$lt' in v && !(val < v.$lt)) return false;
        if ('$lte' in v && !(val <= v.$lte)) return false;
        if ('$gt' in v && !(val > v.$gt)) return false;
        if ('$gte' in v && !(val >= v.$gte)) return false;
        if ('$in' in v && !v.$in.includes(val)) return false;
        return true;
      }
      if (typeof v === 'object' && !Array.isArray(v)) {
        return memMatch(item[k], v);
      }
      return item[k] === v;
    });
  }
  return item === predicate;
}

const mongodb = uri ? (() => {
  // Fast timeouts: a blocked/unreachable Atlas must fail in seconds,
  // not hang past the serverless function limit (30s = dead request)
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 15000,
  });
  let dbInstance = null;
  async function getDb() {
    if (dbInstance) return dbInstance;
    await client.connect();
    dbInstance = client.db('gridrunner');
    return dbInstance;
  }
  return { getDb };
})() : null;

let mongoWarned = false;
function warnMongoDown(e) {
  if (!mongoWarned) {
    mongoWarned = true;
    console.error('[db] MongoDB unreachable, falling back to in-memory:', e.message);
  }
}

// After a failed connect, skip Mongo entirely for a cooldown window.
// Otherwise every db call pays the full connect timeout and a single
// request with many queries blows past the serverless time limit.
let lastConnectFailAt = 0;
const CONNECT_RETRY_COOLDOWN_MS = 60000;

async function getDb() {
  if (!mongodb) return null;
  if (Date.now() - lastConnectFailAt < CONNECT_RETRY_COOLDOWN_MS) {
    throw new Error('mongo connect cooldown');
  }
  try {
    return await mongodb.getDb();
  } catch (e) {
    lastConnectFailAt = Date.now();
    throw e;
  }
}

async function load(collection) {
  if (mongodb) {
    try {
      const db = await getDb();
      return await db.collection(collection).find({}).toArray();
    } catch (e) { warnMongoDown(e); }
  }
  return await getMemCol(collection);
}

async function findOne(collection, predicate) {
  if (mongodb) {
    try {
      const db = await getDb();
      return await db.collection(collection).findOne(predicate);
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  return col.find(item => memMatch(item, predicate)) || null;
}

async function findById(collection, id) {
  if (mongodb) {
    try {
      const db = await getDb();
      return await db.collection(collection).findOne({ id });
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  return col.find(item => item.id === id) || null;
}

async function insert(collection, item) {
  item.id = item.id || (Date.now() + Math.floor(Math.random() * 1000));
  if (mongodb) {
    try {
      const db = await getDb();
      await db.collection(collection).insertOne(item);
      return item;
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  col.push(item);
  savePersisted(collection);
  return item;
}

async function update(collection, id, updates) {
  if (mongodb) {
    try {
      const db = await getDb();
      const set = {};
      for (const [k, v] of Object.entries(updates)) {
        if (k.startsWith('$')) { Object.assign(set, v); }
        else { set[k] = v; }
      }
      await db.collection(collection).updateOne({ id }, { $set: set });
      return await findById(collection, id);
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  const idx = col.findIndex(item => item.id === id);
  if (idx === -1) return null;
  for (const [k, v] of Object.entries(updates)) {
    if (k.startsWith('$')) { Object.assign(col[idx], v); }
    else { col[idx][k] = v; }
  }
  savePersisted(collection);
  return col[idx];
}

async function remove(collection, id) {
  if (mongodb) {
    try {
      const db = await getDb();
      const result = await db.collection(collection).deleteOne({ id });
      return result.deletedCount > 0;
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  const idx = col.findIndex(item => item.id === id);
  if (idx === -1) return false;
  col.splice(idx, 1);
  savePersisted(collection);
  return true;
}

async function query(collection, predicate) {
  if (mongodb) {
    try {
      const db = await getDb();
      return await db.collection(collection).find(predicate).toArray();
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  if (!predicate) return [...col];
  return col.filter(item => memMatch(item, predicate));
}

async function removeWhere(collection, predicate) {
  if (mongodb) {
    try {
      const db = await getDb();
      const result = await db.collection(collection).deleteMany(predicate || {});
      return result.deletedCount;
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  const before = col.length;
  memoryDb[collection] = col.filter(item => !memMatch(item, predicate));
  savePersisted(collection);
  return before - memoryDb[collection].length;
}

async function count(collection, predicate) {
  if (mongodb) {
    try {
      const db = await getDb();
      return await db.collection(collection).countDocuments(predicate || {});
    } catch (e) { warnMongoDown(e); }
  }
  const col = await getMemCol(collection);
  if (!predicate) return col.length;
  return col.filter(item => memMatch(item, predicate)).length;
}

module.exports = { load, findOne, findById, insert, update, remove, removeWhere, query, count, pointInPolygon };