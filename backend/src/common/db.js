const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

const uri = process.env.MONGODB_URI;
const memoryDb = {};

// Preload seed data for in-memory mode
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!uri && fs.existsSync(path.join(DATA_DIR, 'zones.json'))) {
  try {
    memoryDb.zones = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'zones.json'), 'utf8'));
    console.log(`[db] Preloaded ${memoryDb.zones.length} zones from data/zones.json`);
  } catch (e) {
    console.warn('[db] Failed to load zones seed:', e.message);
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
      // Handle nested MongoDB operators like { geometry: { $geoIntersects: ... } }
      if (typeof v === 'object' && !Array.isArray(v)) {
        return memMatch(item[k], v);
      }
      return item[k] === v;
    });
  }
  return item === predicate;
}

const mongodb = uri ? (() => {
  const client = new MongoClient(uri);
  let dbInstance = null;
  async function getDb() {
    if (dbInstance) return dbInstance;
    await client.connect();
    dbInstance = client.db('gridrunner');
    return dbInstance;
  }
  return { getDb };
})() : null;

async function getDb() {
  if (!mongodb) return null;
  return mongodb.getDb();
}

async function load(collection) {
  if (mongodb) {
    const db = await getDb();
    return await db.collection(collection).find({}).toArray();
  }
  return await getMemCol(collection);
}

async function findOne(collection, predicate) {
  if (mongodb) {
    const db = await getDb();
    return await db.collection(collection).findOne(predicate);
  }
  const col = await getMemCol(collection);
  return col.find(item => memMatch(item, predicate)) || null;
}

async function findById(collection, id) {
  if (mongodb) {
    const db = await getDb();
    return await db.collection(collection).findOne({ id });
  }
  const col = await getMemCol(collection);
  return col.find(item => item.id === id) || null;
}

async function insert(collection, item) {
  item.id = item.id || (Date.now() + Math.floor(Math.random() * 1000));
  if (mongodb) {
    const db = await getDb();
    await db.collection(collection).insertOne(item);
  } else {
    const col = await getMemCol(collection);
    col.push(item);
  }
  return item;
}

async function update(collection, id, updates) {
  if (mongodb) {
    const db = await getDb();
    const set = {};
    for (const [k, v] of Object.entries(updates)) {
      if (k.startsWith('$')) { Object.assign(set, v); }
      else { set[k] = v; }
    }
    await db.collection(collection).updateOne({ id }, { $set: set });
    return await findById(collection, id);
  }
  const col = await getMemCol(collection);
  const idx = col.findIndex(item => item.id === id);
  if (idx === -1) return null;
  for (const [k, v] of Object.entries(updates)) {
    if (k.startsWith('$')) { Object.assign(col[idx], v); }
    else { col[idx][k] = v; }
  }
  return col[idx];
}

async function remove(collection, id) {
  if (mongodb) {
    const db = await getDb();
    const result = await db.collection(collection).deleteOne({ id });
    return result.deletedCount > 0;
  }
  const col = await getMemCol(collection);
  const idx = col.findIndex(item => item.id === id);
  if (idx === -1) return false;
  col.splice(idx, 1);
  return true;
}

async function query(collection, predicate) {
  if (mongodb) {
    const db = await getDb();
    return await db.collection(collection).find(predicate).toArray();
  }
  const col = await getMemCol(collection);
  if (!predicate) return [...col];
  return col.filter(item => memMatch(item, predicate));
}

async function count(collection, predicate) {
  if (mongodb) {
    const db = await getDb();
    return await db.collection(collection).countDocuments(predicate || {});
  }
  const col = await getMemCol(collection);
  if (!predicate) return col.length;
  return col.filter(item => memMatch(item, predicate)).length;
}

module.exports = { load, findOne, findById, insert, update, remove, query, count, pointInPolygon };
