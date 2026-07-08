// Глобальная сетка арены: квадраты ~150×150 м с детерминированными id
// (zg_<latIdx>_<lngIdx>) — одинаковы для всех игроков и устройств.
const db = require('../common/db');

const GRID_LAT_STEP = 0.00135; // ≈150 м
const GRID_RADIUS_CELLS = 4;   // 9×9 квадратов вокруг игрока

function gridLngStep(latIdx) {
  const latDeg = latIdx * GRID_LAT_STEP;
  return GRID_LAT_STEP / Math.max(0.2, Math.cos(latDeg * Math.PI / 180));
}

function gridCellPolygon(latIdx, lngIdx) {
  const lngStep = gridLngStep(latIdx);
  const s = latIdx * GRID_LAT_STEP;
  const w = lngIdx * lngStep;
  return {
    type: 'Polygon',
    coordinates: [[
      [w, s], [w + lngStep, s], [w + lngStep, s + GRID_LAT_STEP], [w, s + GRID_LAT_STEP], [w, s],
    ]],
  };
}

function gridCellAt(lat, lng) {
  const latIdx = Math.floor(lat / GRID_LAT_STEP);
  const lngIdx = Math.floor(lng / gridLngStep(latIdx));
  return { latIdx, lngIdx, id: `zg_${latIdx}_${lngIdx}` };
}

// Создаёт недостающие квадраты сетки вокруг точки; возвращает их id
async function ensureGridAround(lat, lng) {
  const { latIdx } = gridCellAt(lat, lng);
  const wanted = [];
  for (let dy = -GRID_RADIUS_CELLS; dy <= GRID_RADIUS_CELLS; dy++) {
    const li = latIdx + dy;
    const lngIdx0 = Math.floor(lng / gridLngStep(li));
    for (let dx = -GRID_RADIUS_CELLS; dx <= GRID_RADIUS_CELLS; dx++) {
      wanted.push({ id: `zg_${li}_${lngIdx0 + dx}`, li, lngIdx: lngIdx0 + dx });
    }
  }
  const existing = await db.query('zones', { id: { $in: wanted.map(w => w.id) } });
  const have = new Set(existing.map(z => z.id));
  const created = [];
  for (const w of wanted) {
    if (have.has(w.id)) continue;
    await db.insert('zones', {
      id: w.id,
      geometry: gridCellPolygon(w.li, w.lngIdx),
      controllingFaction: null,
      influence: {},
      activeTrap: null,
      activeBuff: null,
      created_at: new Date().toISOString(),
    });
    created.push(w.id);
  }
  return created;
}

// Гарантирует зону под координатами и возвращает её (для стартового штаба)
async function ensureCellZone(lat, lng) {
  const { latIdx, lngIdx, id } = gridCellAt(lat, lng);
  let zone = await db.findOne('zones', { id });
  if (!zone) {
    zone = await db.insert('zones', {
      id,
      geometry: gridCellPolygon(latIdx, lngIdx),
      controllingFaction: null,
      influence: {},
      activeTrap: null,
      activeBuff: null,
      created_at: new Date().toISOString(),
    });
  }
  return zone;
}

module.exports = { GRID_LAT_STEP, GRID_RADIUS_CELLS, gridLngStep, gridCellPolygon, gridCellAt, ensureGridAround, ensureCellZone };
