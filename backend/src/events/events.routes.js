const { Router } = require('express');
const db = require('../common/db');
const events = require('../common/events');
const { authenticate } = require('../common/middleware');

const router = Router();
router.use(authenticate);

// Poll endpoint: GET /api/v1/events?since=<ms timestamp>
// Returns events addressed to the user or their faction since the cursor.
router.get('/', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  const factionId = account?.factionId || null;
  const list = await events.fetchFor(req.user.id, factionId, req.query.since);
  res.json({ success: true, events: list, now: Date.now() });
});

module.exports = router;
