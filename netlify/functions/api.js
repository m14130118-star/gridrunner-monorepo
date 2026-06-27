const serverless = require('serverless-http');
const app = require('../../backend/src/app');

exports.handler = serverless(app);
