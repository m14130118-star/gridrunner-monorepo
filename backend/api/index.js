// Vercel serverless entry: the whole Express app runs as one function.
// vercel.json rewrites every request here with the original URL intact.
module.exports = require('../src/app');
