// /api/v1/quests — контракты/операции/директивы + обучающая миссия «Курс саботажника».
// Туториал полностью безопасен: бэкенд эмулирует вражескую базу вокруг игрока,
// реальные зоны и мины не участвуют.

const { Router } = require('express');
const db = require('../common/db');
const { authenticate, checkBan } = require('../common/middleware');
const engine = require('./missionEngine');

const router = Router();
router.use(authenticate, checkBan);

const TUTORIAL_XP = 15;

router.get('/', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  const missions = await engine.listForUser(req.user.id);
  res.json({
    success: true,
    tutorial: { id: 'tutorial_saboteur', title: 'Курс саботажника', completed: !!account?.tutorial_completed },
    missions,
  });
});

router.post('/accept/:id', async (req, res) => {
  const result = await engine.accept(req.user.id, req.params.id);
  if (!result.ok) return res.status(400).json({ success: false, message: result.message });
  res.json({ success: true, mission: result.mission });
});

// Туториал, шаг «Сканер»: генерим виртуальную мину строго в 15 м от игрока
router.post('/tutorial/scan', (req, res) => {
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ success: false, message: 'lat/lng required' });
  }
  const distM = 15;
  const bearing = Math.random() * 2 * Math.PI;
  const dLat = (distM * Math.cos(bearing)) / 111320;
  const dLng = (distM * Math.sin(bearing)) / (111320 * Math.cos(lat * Math.PI / 180));
  res.json({ success: true, mine: { lat: lat + dLat, lng: lng + dLng, virtual: true } });
});

// Туториал пройден: +15 XP на общий уровень (одноразово)
router.post('/tutorial/complete', async (req, res) => {
  const account = await db.findById('accounts', req.user.id);
  if (!account) return res.status(404).json({ success: false, message: 'Not found' });

  const first = !account.tutorial_completed;
  if (first) {
    account.tutorial_completed = true;
    account.xp = (account.xp || 0) + TUTORIAL_XP;
    const newLevel = Math.floor(account.xp / 1000) + 1;
    if (newLevel > (account.level || 1)) account.level = newLevel;
    await db.update('accounts', req.user.id, {
      tutorial_completed: true, xp: account.xp, level: account.level,
    });
  }
  res.json({ success: true, xpAwarded: first ? TUTORIAL_XP : 0, alreadyCompleted: !first });
});

module.exports = router;
