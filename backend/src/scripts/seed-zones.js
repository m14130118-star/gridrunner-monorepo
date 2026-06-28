// run: node src/scripts/seed-zones.js
const path = require('path');
const fs = require('fs');

async function seed() {
  const CITY = { center: { lat: 55.0302, lng: 82.9204 }, radiusKm: 2, gridSizeM: 100 };

  const earthRadius = 6371000;
  const latRad = CITY.center.lat * Math.PI / 180;
  const lngPerM = 360 / (2 * Math.PI * earthRadius * Math.cos(latRad));
  const latPerM = 360 / (2 * Math.PI * earthRadius);

  const gridDeg = CITY.gridSizeM * lngPerM;
  const gridDegLat = CITY.gridSizeM * latPerM;
  const steps = Math.floor((CITY.radiusKm * 1000) / CITY.gridSizeM);

  const baseLng = CITY.center.lng - (steps / 2) * gridDeg;
  const baseLat = CITY.center.lat - (steps / 2) * gridDegLat;

  const zones = [];
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const swLat = baseLat + i * gridDegLat;
      const swLng = baseLng + j * gridDeg;
      const neLat = swLat + gridDegLat;
      const neLng = swLng + gridDeg;
      zones.push({
        id: `zone_nsk_${i}_${j}`,
        geometry: {
          type: 'Polygon',
          coordinates: [[ [swLng, swLat], [neLng, swLat], [neLng, neLat], [swLng, neLat], [swLng, swLat] ]],
        },
        controllingFaction: null,
        influence: {},
        activeTrap: null,
        activeBuff: null,
      });
    }
  }

  // Always write to file for in-memory preload
  const dataDir = path.join(__dirname, '..', '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, 'zones.json'), JSON.stringify(zones, null, 2));
  console.log(`Written ${zones.length} zones to data/zones.json`);

  // Also try MongoDB if available
  if (process.env.MONGODB_URI) {
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('gridrunner');
    await db.collection('zones').deleteMany({});
    await db.collection('zones').insertMany(zones);
    await db.collection('zones').createIndex({ geometry: '2dsphere' });
    await client.close();
    console.log('Also written to MongoDB');
  }

  console.log(`✅ Seeded ${zones.length} zones`);
}

seed().catch(e => { console.error(e); process.exit(1); }).then(() => process.exit(0));
