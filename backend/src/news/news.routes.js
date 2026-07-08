// Public news feed. Managed by the admin via /api/v1/admin/news CRUD.
const { Router } = require('express');
const db = require('../common/db');

const router = Router();

router.get('/', async (req, res) => {
  const news = await db.load('news');
  const sorted = news
    .filter(n => n.published !== false)
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.date - a.date)
    .slice(0, 100);
  res.json({ success: true, news: sorted });
});

module.exports = router;
