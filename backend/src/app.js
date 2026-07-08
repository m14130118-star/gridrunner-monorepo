const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { rateLimit } = require('./common/rateLimit');

const app = express();

app.use(cors({ origin: true, credentials: true, optionsSuccessStatus: 200 }));
app.use(helmet());
app.use(express.json({ limit: '200kb' }));

// Anti-flood: general cap per IP + strict caps on auth (brute force)
// and route generation (external API quota)
app.use('/api/v1', rateLimit({ windowMs: 60000, max: 240, keyPrefix: 'all' }));
const authLimiter = rateLimit({ windowMs: 10 * 60000, max: 20, keyPrefix: 'auth', message: 'Слишком много попыток входа. Подожди 10 минут.' });
const genLimiter = rateLimit({ windowMs: 5 * 60000, max: 15, keyPrefix: 'gen', message: 'Слишком частая генерация маршрутов. Подожди немного.' });
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/admin/login', authLimiter);
app.use('/api/v1/geo/route/generate', genLimiter);

app.use('/api/v1/auth', require('./auth/auth.routes'));
app.use('/api/v1/player', require('./player/player.routes'));
app.use('/api/v1/geo', require('./geo/geo.routes'));
app.use('/api/v1/payment', require('./payment/payment.routes'));
app.use('/api/v1/arena', require('./arena/arena.routes'));
app.use('/api/v1/factions', require('./factions/factions.routes'));
app.use('/api/v1/admin', require('./admin/admin.routes'));
app.use('/api/v1/events', require('./events/events.routes'));
app.use('/api/v1/quests', require('./missions/missions.routes'));
app.use('/api/v1/news', require('./news/news.routes'));

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

// Global async error handler — prevents server crash
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal error' });
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED]', reason?.message || reason);
});

module.exports = app;
