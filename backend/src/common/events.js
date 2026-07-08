// Event bus for near-realtime notifications.
// Netlify Functions are stateless, so instead of WebSockets events are
// written to the `events` collection and clients poll GET /api/v1/events.

const db = require('./db');

const EVENT_TTL_MS = 24 * 3600000; // events older than 24h are pruned

// type: 'zone_captured' | 'zone_attacked' | 'territory_lost' | 'trap_triggered'
//       | 'trade_received' | 'member_joined' | 'elo_change' ...
// target: { userId } or { factionId } — who should see the event
async function emit(type, payload, target = {}) {
  try {
    const event = await db.insert('events', {
      type,
      payload: payload || {},
      userId: target.userId || null,
      factionId: target.factionId || null,
      ts: Date.now(),
    });
    // Opportunistic prune (~5% of emits) to keep the collection small
    if (Math.random() < 0.05) {
      await db.removeWhere('events', { ts: { $lt: Date.now() - EVENT_TTL_MS } });
    }
    return event;
  } catch (e) {
    console.warn('[events] emit failed:', e.message);
    return null;
  }
}

// Events visible to a user: addressed to them or to their faction,
// excluding events they caused themselves (actorId).
async function fetchFor(userId, factionId, since) {
  const sinceTs = Number(since) || Date.now() - 3600000;
  const or = [{ userId }];
  if (factionId) or.push({ factionId });
  const events = await db.query('events', { $or: or, ts: { $gt: sinceTs } });
  return events
    .filter(e => e.payload?.actorId !== userId)
    .sort((a, b) => a.ts - b.ts)
    .slice(-50);
}

module.exports = { emit, fetchFor };
