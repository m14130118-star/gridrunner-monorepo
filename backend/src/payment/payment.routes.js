const { Router } = require('express');
const crypto = require('crypto');
const db = require('../common/db');
const { authenticate } = require('../common/middleware');

const router = Router();

const PLATEGA_MERCHANT_ID = process.env.PLATEGA_MERCHANT_ID || '';
const PLATEGA_SECRET = process.env.PLATEGA_SECRET || '';
const PLATEGA_API = 'https://app.platega.io';

const PLANS = {
  vip_monthly: { name: 'VIP Monthly', price_rub: 199, price_usd: 1.99, duration_days: 30 },
  vip_yearly: { name: 'VIP Yearly', price_rub: 1490, price_usd: 14.99, duration_days: 365 },
};

const WEBHOOK_SECRET = process.env.PLATEGA_WEBHOOK_SECRET || '';

// Payment methods: 2=SBP(QR), 3=ERIP, 11=Card, 12=International, 13=Crypto
const PAYMENT_METHOD = 11; // card acquiring by default

async function plategaRequest(method, path, body) {
  const opts = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-MerchantId': PLATEGA_MERCHANT_ID,
      'X-Secret': PLATEGA_SECRET,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${PLATEGA_API}${path}`, opts);
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { error: text, status: r.status }; }
}

// Platega webhook (no auth — called by Platega on payment status change)
router.post('/platega-webhook', async (req, res) => {
  try {
    // Verify the callback actually comes from Platega: it echoes back the
    // merchant credentials in headers. Without this check anyone could grant
    // themselves VIP by POSTing to this endpoint.
    if (PLATEGA_MERCHANT_ID && PLATEGA_SECRET) {
      const mid = req.headers['x-merchantid'] || req.headers['x-merchant-id'];
      const secret = req.headers['x-secret'];
      if (mid !== PLATEGA_MERCHANT_ID || secret !== PLATEGA_SECRET) {
        console.warn('[Platega] Webhook auth failed');
        return res.status(403).send('Forbidden');
      }
    }

    const payload = req.body;
    const txId = payload.id || payload.transactionId;
    const status = payload.status || payload.state;
    if (!txId || !status) return res.status(400).send('Missing fields');

    if (status !== 'SUCCESS' && status !== 'payed' && status !== 'completed') {
      return res.status(200).send('OK');
    }

    let userId, planId;
    const extra = payload.payload || payload.extra || '';
    try { const parsed = JSON.parse(typeof extra === 'string' ? extra : JSON.stringify(extra)); userId = parsed.user_id; planId = parsed.plan_id; } catch {}

    if (!userId || !planId) {
      // Fallback: lookup session by platega_tx_id
      const sessions = await db.query('payment_sessions', { platega_tx_id: txId });
      if (sessions.length > 0) {
        userId = sessions[0].user_id;
        planId = sessions[0].plan_id;
      }
    }
    if (!userId || !planId) return res.status(400).send('Missing user/plan');

    const plan = PLANS[planId];
    if (!plan) return res.status(400).send('Invalid plan');

    const account = await db.findById('accounts', userId);
    if (!account) return res.status(404).send('User not found');

    await db.update('accounts', userId, {
      isVip: true,
      vipExpiresAt: new Date(Date.now() + plan.duration_days * 86400000).toISOString(),
    });

    const sessions = await db.query('payment_sessions', { user_id: userId, status: 'pending' });
    if (sessions.length > 0) {
      await db.update('payment_sessions', sessions[0].id, { status: 'completed', platega_tx_id: txId });
    }

    // VIP achievement
    const existing = await db.query('achievements', { user_id: userId, achievement_id: 'vip_status_1' });
    if (existing.length === 0) {
      await db.insert('achievements', {
        user_id: userId, achievement_id: 'vip_status_1', name: 'VIP Статус',
        title: 'Призрачный Гонщик', description: 'Оформлена VIP-подписка',
        icon: 'crown', is_unlocked: true, unlocked_at: new Date().toISOString(),
      });
    }

    res.status(200).send('OK');
  } catch (e) {
    console.error('Platega webhook error:', e);
    res.status(500).send('Error');
  }
});

router.use(authenticate);

router.get('/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

router.post('/create-session', async (req, res) => {
  const { plan_id } = req.body;
  const plan = PLANS[plan_id];
  if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

  const session = await db.insert('payment_sessions', {
    user_id: req.user.id, plan_id, amount: plan.price_rub,
    currency: 'RUB', status: 'pending',
    created_at: new Date().toISOString(),
  });

  let paymentUrl = null;
  let txId = null;

  if (PLATEGA_MERCHANT_ID && PLATEGA_SECRET) {
    try {
      const GAME_URL = process.env.GAME_URL || 'https://game-gridrunner.vercel.app';
      const callbackUrl = process.env.URL
        ? `${process.env.URL}/api/v1/payment/platega-webhook`
        : 'https://gridrunner-api.vercel.app/api/v1/payment/platega-webhook';

      const result = await plategaRequest('POST', '/transaction/process', {
        paymentMethod: PAYMENT_METHOD,
        paymentDetails: { amount: plan.price_rub, currency: 'RUB' },
        description: plan.name,
        return: `${GAME_URL}/vip?success=1&session_id=${session.id}`,
        failedUrl: `${GAME_URL}/vip?failed=1`,
        payload: JSON.stringify({ user_id: String(req.user.id), plan_id, session_id: String(session.id) }),
      });

      if (result?.redirect) {
        paymentUrl = result.redirect;
        txId = result.transactionId || result.id;
        await db.update('payment_sessions', session.id, { platega_tx_id: txId });
      } else {
        console.warn('[Platega] Create failed:', JSON.stringify(result));
      }
    } catch (e) {
      console.error('[Platega] Create error:', e);
    }
  }

  if (!paymentUrl) {
    paymentUrl = `/vip?manual=${session.id}`;
  }

  res.json({
    success: true, session_id: session.id,
    payment_url: paymentUrl,
    redirect_url: paymentUrl,
    amount: plan.price_rub, description: plan.name,
  });
});

router.post('/business-pay', async (req, res) => {
  const { amount = 1000, paymentMethod = 2 } = req.body;

  if (!PLATEGA_MERCHANT_ID || !PLATEGA_SECRET) {
    return res.status(500).json({ success: false, message: 'Платежи временно недоступны' });
  }

  const origin = req.headers.origin || 'https://gridrunner.duckdns.org';

  try {
    const result = await plategaRequest('POST', '/transaction/process', {
      paymentMethod,
      id: crypto.randomUUID(),
      paymentDetails: { amount, currency: 'RUB' },
      description: 'Услуги GridRunner Business',
      return: `${origin}/business?success=1`,
      failedUrl: `${origin}/business?failed=1`,
    });

    if (result?.redirect) {
      return res.json({ success: true, redirect_url: result.redirect, transactionId: result.transactionId });
    } else {
      console.warn('[Platega] Business pay failed:', JSON.stringify(result));
      return res.status(502).json({ success: false, message: result.message || 'Ошибка создания платежа' });
    }
  } catch (e) {
    console.error('[Platega] Business pay error:', e);
    return res.status(500).json({ success: false, message: 'Внутренняя ошибка' });
  }
});

router.post('/confirm', async (req, res) => {
  const { session_id } = req.body;
  const session = await db.findById('payment_sessions', session_id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  // When a payment provider is configured, a session without a provider
  // transaction can't be confirmed manually — that would be free VIP.
  if (PLATEGA_MERCHANT_ID && PLATEGA_SECRET && !session.platega_tx_id) {
    return res.status(400).json({ success: false, message: 'Счёт не был создан. Начните оплату заново' });
  }

  // If Platega transaction exists, check its real status
  if (session.platega_tx_id && PLATEGA_MERCHANT_ID) {
    try {
      const check = await plategaRequest('GET', `/transaction/${session.platega_tx_id}`);
      const status = (check?.status || '').toUpperCase();
      if (status === 'SUCCESS' || status === 'PAYED' || status === 'COMPLETED') {
        // confirmed
      } else {
        return res.status(400).json({ success: false, message: 'Платёж не найден. Оплатите счёт и попробуйте снова' });
      }
    } catch {
      return res.status(500).json({ success: false, message: 'Не удалось проверить платёж' });
    }
  }

  const plan = PLANS[session.plan_id];
  const account = await db.findById('accounts', session.user_id);
  if (!account) return res.status(404).json({ success: false, message: 'User not found' });

  account.isVip = true;
  account.vipExpiresAt = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
  await db.update('accounts', session.user_id, account);
  await db.update('payment_sessions', session_id, { status: 'completed' });

  const existing = await db.query('achievements', { user_id: session.user_id, achievement_id: 'vip_status_1' });
  if (existing.length === 0) {
    await db.insert('achievements', {
      user_id: session.user_id, achievement_id: 'vip_status_1', name: 'VIP Статус',
      title: 'Призрачный Гонщик', description: 'Оформлена VIP-подписка',
      icon: 'crown', is_unlocked: true, unlocked_at: new Date().toISOString(),
    });
  }

  res.json({ success: true, vip_until: account.vipExpiresAt });
});

router.get('/history', async (req, res) => {
  const sessions = await db.query('payment_sessions', { user_id: req.user.id });
  res.json({ success: true, sessions });
});

module.exports = router;