const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

app.use('/api/v1/auth', require('./auth/auth.routes'));
app.use('/api/v1/player', require('./player/player.routes'));
app.use('/api/v1/geo', require('./geo/geo.routes'));
app.use('/api/v1/payment', require('./payment/payment.routes'));

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', version: '2.0.0' }));

module.exports = app;
