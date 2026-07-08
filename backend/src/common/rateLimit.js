// Zero-dependency sliding-window rate limiter (per process).
// On serverless each instance keeps its own counters — best-effort protection
// against brute force and request floods, enough for the current scale.

const buckets = new Map();

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function rateLimit({ windowMs = 60000, max = 60, keyPrefix = 'g', message = 'Слишком много запросов, попробуй позже' } = {}) {
  return (req, res, next) => {
    const key = `${keyPrefix}:${clientIp(req)}`;
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || now - entry.start >= windowMs) {
      entry = { start: now, count: 0 };
      buckets.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.start + windowMs - now) / 1000));
      return res.status(429).json({ success: false, message });
    }
    // Opportunistic cleanup so the map doesn't grow unbounded
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (now - v.start >= windowMs) buckets.delete(k);
      }
    }
    next();
  };
}

module.exports = { rateLimit };
