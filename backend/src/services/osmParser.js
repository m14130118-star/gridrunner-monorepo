const axios = require('axios');
const { getDb } = require('../common/db.js');

async function seedCityFromOSM(lat, lng, radiusMeters = 5000) {
  const db = await getDb();
  const overpassQuery = `
    [out:json][timeout:120];
    (
      node["amenity"~"cafe|restaurant"](around:${radiusMeters},${lat},${lng});
      node["leisure"="park"](around:${radiusMeters},${lat},${lng});
      node["tourism"~"attraction|viewpoint"](around:${radiusMeters},${lat},${lng});
    );
    out body;
  `;

  try {
    const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery);
    const elements = response.data.elements || [];
    if (elements.length === 0) return { success: false, message: "OSM не вернул точек." };

    const documents = elements.map(el => ({
      name: el.tags?.name || 'Интересная локация',
      vibe: el.tags?.amenity ? 'neon-chill' : 'cyberpunk',
      location: { type: "Point", coordinates: [el.lon, el.lat] },
      osmId: el.id.toString(),
      updatedAt: new Date()
    }));

    await db.collection('pois').insertMany(documents, { ordered: false });
    await db.collection('pois').createIndex({ location: "2dsphere" });

    return { success: true, count: documents.length };
  } catch (error) {
    console.error('Ошибка импорта из OSM:', error);
    throw error;
  }
}

module.exports = { seedCityFromOSM };
