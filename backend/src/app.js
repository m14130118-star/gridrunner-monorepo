const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

app.use(cors({ origin: true, credentials: true, optionsSuccessStatus: 200 }));
app.use(helmet());
app.use(express.json());

app.use('/api/v1/auth', require('./auth/auth.routes'));
app.use('/api/v1/player', require('./player/player.routes'));
app.use('/api/v1/geo', require('./geo/geo.routes'));
app.use('/api/v1/payment', require('./payment/payment.routes'));
app.use('/api/v1/arena', require('./arena/arena.routes'));
app.use('/api/v1/factions', require('./factions/factions.routes'));

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
