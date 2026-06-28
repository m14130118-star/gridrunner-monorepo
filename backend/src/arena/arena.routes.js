const { Router } = require('express');
const db = require('../common/db');
const { authenticate } = require('../common/middleware');

const router = Router();
router.use(authenticate);

async function getInventory(userId) {
  let inv = await db.findOne('inventories', { userId });
  if (!inv) {
    inv = await db.insert('inventories', {
      userId,
      items: { shield: 2, medpack: 4, scanner: 1, vibe_booster: 1, trap: 3 },
    });
  }
  return inv;
}

async function useInventoryItem(userId, itemType) {
  const inv = await getInventory(userId);
  if (inv.items[itemType] > 0) {
    inv.items[itemType] -= 1;
    await db.update('inventories', inv.id, inv);
  }
}

router.get('/get-inventory', async (req, res) => {
  const inv = await getInventory(req.user.id);
  res.json({ success: true, inventory: inv });
});

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buffExpired(zone) {
  return zone?.activeBuff?.expiresAt && new Date(zone.activeBuff.expiresAt) < new Date();
}

async function cleanupZoneBuffs(zones) {
  for (const z of zones) {
    if (buffExpired(z)) {
      z.activeBuff = null;
      await db.update('zones', z.id, { activeBuff: null });
    }
  }
}

router.get('/zones', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  let zones = await db.load('zones');
  const factions = await db.load('factions');
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  zones = zones.filter(z => {
    if (z.geometry?.type === 'Polygon') {
      const center = z.geometry.coordinates[0].reduce((a, c) => [a[0] + c[0], a[1] + c[1]], [0, 0]);
      center[0] /= z.geometry.coordinates[0].length;
      center[1] /= z.geometry.coordinates[0].length;
      return haversine(latNum, lngNum, center[1], center[0]) <= 2;
    }
    return false;
  });

  const zonesWithColors = zones.map(z => {
    if (buffExpired(z)) z.activeBuff = null;
    const color = factions.find(f => f.id === z.controllingFaction)?.color || '#555';
    return {
      type: 'Feature',
      geometry: z.geometry,
      properties: {
        id: z.id,
        controllingFaction: z.controllingFaction || null,
        factionColor: color,
        influence: z.influence || {},
        hasTrap: !!z.activeTrap,
        hasBuff: !!z.activeBuff,
      },
    };
  });

  res.json({ success: true, zones: zonesWithColors });
});

router.post('/step', async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });

  let zone = await db.findOne('zones', {
    geometry: { $geoIntersects: { $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] } } }
  });
  if (!zone) return res.json({ success: true, message: 'Outside any zone', hp: account.hp });

  if (buffExpired(zone)) {
    zone.activeBuff = null;
    await db.update('zones', zone.id, { activeBuff: null });
  }

  const result = { zoneId: zone.id, hp: account.hp, gridCoins: account.gridCoins || 0, captured: false, trapHit: null };

  // Capture logic
  if (account.factionId) {
    if (!zone.influence) zone.influence = {};
    const influenceBoost = zone.activeBuff?.type === 'vibe_booster' ? 20 : 10;
    zone.influence[account.factionId] = (zone.influence[account.factionId] || 0) + influenceBoost;

    let maxInf = 0;
    let bestFaction = zone.controllingFaction;
    for (const f in zone.influence) {
      if (zone.influence[f] > maxInf) {
        maxInf = zone.influence[f];
        bestFaction = f;
      }
    }
    if (bestFaction !== zone.controllingFaction) {
      zone.controllingFaction = bestFaction;
      result.captured = true;
    }
    await db.update('zones', zone.id, zone);

    account.gridCoins = (account.gridCoins || 0) + (influenceBoost === 20 ? 4 : 2);
    account.xp = (account.xp || 0) + (influenceBoost === 20 ? 8 : 4);
    result.gridCoins = account.gridCoins;
  }

  // Trap check
  if (zone.activeTrap && zone.activeTrap.placedBy !== req.user.id) {
    const placedByAccount = await db.findById('accounts', zone.activeTrap.placedBy);
    if (placedByAccount && placedByAccount.factionId !== account.factionId) {
      const hasShield = (await getInventory(req.user.id))?.items?.shield > 0;
      if (hasShield) {
        await useInventoryItem(req.user.id, 'shield');
        result.trapHit = { type: zone.activeTrap.type, damage: 0, blocked: true };
      } else {
        const dmg = zone.activeTrap.damage || 25;
        account.hp = Math.max(0, (account.hp || 100) - dmg);
        result.trapHit = { type: zone.activeTrap.type, damage: dmg, blocked: false };
        result.hp = account.hp;

        // Death penalty
        if (account.hp <= 0) {
          account.hp = 30;
          const allZones = await db.load('zones');
          const factionZones = allZones.filter(z => z.controllingFaction === account.factionId);
          const toLose = Math.max(1, Math.floor(factionZones.length * 0.1));
          const shuffled = factionZones.sort(() => Math.random() - 0.5).slice(0, toLose);
          for (const z of shuffled) {
            if (z.influence) delete z.influence[account.factionId];
            z.controllingFaction = placedByAccount.factionId;
            await db.update('zones', z.id, z);
          }
          result.deathPenalty = { zonesLost: toLose, attackerFaction: placedByAccount.factionId };
        }
      }
      // Destroy trap after trigger
      await db.update('zones', zone.id, { activeTrap: null });
    }
  }

  // Save account state
  await db.update('accounts', req.user.id, { hp: account.hp, gridCoins: account.gridCoins, xp: account.xp });

  res.json({ success: true, ...result });
});

router.post('/use-item', async (req, res) => {
  const { itemType, lat, lng } = req.body;
  if (!itemType) return res.status(400).json({ success: false, message: 'itemType required' });

  const validItems = ['shield', 'medpack', 'scanner', 'vibe_booster'];
  if (!validItems.includes(itemType)) return res.status(400).json({ success: false, message: 'Invalid item type' });

  const inv = await getInventory(req.user.id);
  if (!inv.items?.[itemType] || inv.items[itemType] <= 0) {
    return res.status(400).json({ success: false, message: 'Item not available' });
  }

  const account = await db.findById('accounts', req.user.id);

  switch (itemType) {
    case 'medpack':
      account.hp = Math.min(100, (account.hp || 0) + 30);
      await db.update('accounts', req.user.id, { hp: account.hp });
      break;
    case 'shield':
      break; // handled in step
    case 'scanner': {
      if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng for scanner' });
      const zones = await db.load('zones');
      const traps = zones.filter(z => z.activeTrap && haversine(lat, lng, z.geometry?.coordinates?.[0]?.[0]?.[1] || 0, z.geometry?.coordinates?.[0]?.[0]?.[0] || 0) <= 0.15);
      const trapCoords = traps.map(z => ({
        lat: z.geometry.coordinates[0].reduce((s, c) => s + c[1], 0) / z.geometry.coordinates[0].length,
        lng: z.geometry.coordinates[0].reduce((s, c) => s + c[0], 0) / z.geometry.coordinates[0].length,
      }));
      return res.json({ success: true, scanner: { traps: trapCoords, expiresIn: 30 } });
    }
    case 'vibe_booster': {
      if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng for vibe_booster' });
      const zones = await db.load('zones');
      const zone = zones.find(z => db.pointInPolygon(lng, lat, z.geometry));
      if (zone) {
        zone.activeBuff = { type: 'vibe_booster', multiplier: 2.0, expiresAt: new Date(Date.now() + 3600000).toISOString() };
        await db.update('zones', zone.id, zone);
      }
      break;
    }
  }

  inv.items[itemType] -= 1;
  await db.update('inventories', inv.id, inv);

  res.json({ success: true, item: itemType, remaining: inv.items[itemType], hp: account.hp });
});

router.post('/trade/initiate', async (req, res) => {
  const { targetUserId, itemsToOffer, itemsToRequest } = req.body;
  if (!targetUserId || !itemsToOffer || !itemsToRequest) {
    return res.status(400).json({ success: false, message: 'targetUserId, itemsToOffer, itemsToRequest required' });
  }

  const SAFE_ZONES = [
    { lat: 55.7558, lng: 37.6173, radius: 0.3 }, // Moscow center
    { lat: 59.9343, lng: 30.3351, radius: 0.3 }, // SPb center
    { lat: 55.0302, lng: 82.9204, radius: 0.3 }, // Novosibirsk
  ];

  const account = await db.findById('accounts', req.user.id);
  const target = await db.findById('accounts', targetUserId);
  if (!target) return res.status(404).json({ success: false, message: 'Target user not found' });

  const locations = await db.load('locations');
  const myLast = locations.filter(l => l.user_id === req.user.id).sort((a, b) => b.timestamp - a.timestamp)[0];
  const targetLast = locations.filter(l => l.user_id === targetUserId).sort((a, b) => b.timestamp - a.timestamp)[0];

  if (!myLast || !targetLast) return res.status(400).json({ success: false, message: 'Location data missing' });

  const inSafeZone = SAFE_ZONES.some(sz =>
    haversine(myLast.latitude, myLast.longitude, sz.lat, sz.lng) <= sz.radius &&
    haversine(targetLast.latitude, targetLast.longitude, sz.lat, sz.lng) <= sz.radius
  );

  if (!inSafeZone) return res.status(400).json({ success: false, message: 'Both players must be in a Safe Zone' });

  const myInv = await db.findOne('inventories', { userId: req.user.id });
  const targetInv = await db.findOne('inventories', { userId: targetUserId });

  if (!myInv || !targetInv) return res.status(400).json({ success: false, message: 'Inventory error' });

  for (const [item, qty] of Object.entries(itemsToOffer)) {
    if ((myInv.items[item] || 0) < qty) return res.status(400).json({ success: false, message: `Not enough ${item}` });
  }
  for (const [item, qty] of Object.entries(itemsToRequest)) {
    if ((targetInv.items[item] || 0) < qty) return res.status(400).json({ success: false, message: `Target lacks ${item}` });
  }

  for (const [item, qty] of Object.entries(itemsToOffer)) {
    myInv.items[item] -= qty;
    targetInv.items[item] = (targetInv.items[item] || 0) + qty;
  }
  for (const [item, qty] of Object.entries(itemsToRequest)) {
    targetInv.items[item] -= qty;
    myInv.items[item] = (myInv.items[item] || 0) + qty;
  }

  await db.update('inventories', myInv.id, myInv);
  await db.update('inventories', targetInv.id, targetInv);

  res.json({ success: true, myInventory: myInv.items });
});

const SHOP_PRICES = {
  shield: 50, medpack: 30, scanner: 100, vibe_booster: 80, trap: 40,
};

router.post('/shop/buy', async (req, res) => {
  const { itemType } = req.body;
  if (!itemType || !SHOP_PRICES[itemType]) {
    return res.status(400).json({ success: false, message: 'Invalid item' });
  }
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });

  const price = SHOP_PRICES[itemType];
  if ((account.gridCoins || 0) < price) {
    return res.status(400).json({ success: false, message: `Need ${price} gridCoins` });
  }

  account.gridCoins -= price;
  await db.update('accounts', req.user.id, { gridCoins: account.gridCoins });

  const inv = await getInventory(req.user.id);
  inv.items[itemType] = (inv.items[itemType] || 0) + 1;
  await db.update('inventories', inv.id, inv);

  res.json({ success: true, item: itemType, gridCoins: account.gridCoins, inventory: inv.items });
});

router.post('/place-trap', async (req, res) => {
  const { lat, lng } = req.body;
  if (!lat || !lng) return res.status(400).json({ success: false, message: 'lat/lng required' });

  const inv = await getInventory(req.user.id);
  if (!inv.items?.trap || inv.items.trap <= 0) {
    return res.status(400).json({ success: false, message: 'No traps available' });
  }

  let zone = await db.findOne('zones', {
    geometry: { $geoIntersects: { $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] } } }
  });
  if (!zone) return res.status(400).json({ success: false, message: 'Must be inside a zone' });
  if (zone.activeTrap) return res.status(400).json({ success: false, message: 'Zone already has a trap' });

  zone.activeTrap = { placedBy: req.user.id, type: 'trap', damage: 25, placedAt: new Date().toISOString() };
  await db.update('zones', zone.id, zone);

  inv.items.trap -= 1;
  await db.update('inventories', inv.id, inv);

  res.json({ success: true, zoneId: zone.id, trapsLeft: inv.items.trap });
});

module.exports = router;
