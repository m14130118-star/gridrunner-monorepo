const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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
