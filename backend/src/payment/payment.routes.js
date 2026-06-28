const { Router } = require('express');
const db = require('../common/db');
const { authenticate } = require('../common/middleware');

const router = Router();
router.use(authenticate);

// Plans configuration
const PLANS = {
  vip_monthly: { name: 'VIP Monthly', price_rub: 199, price_usd: 1.99, duration_days: 30 },
  vip_yearly: { name: 'VIP Yearly', price_rub: 1490, price_usd: 14.99, duration_days: 365 },
};

router.get('/plans', (req, res) => {
  res.json({ success: true, plans: PLANS });
});

router.post('/create-session', async (req, res) => {
  const { plan_id, provider = 'sbp' } = req.body;
  const plan = PLANS[plan_id];
  if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

  // Mock payment session creation
  const session = await db.insert('payment_sessions', {
    user_id: req.user.id, plan_id, provider, amount: plan.price_rub,
    currency: 'RUB', status: 'pending',
    qr_code: `https://qr.nspk.ru/${Date.now()}`,
    created_at: new Date().toISOString(),
  });

  res.json({
    success: true, session_id: session.id,
    redirect_url: provider === 'sbp' ? null : 'https://checkout.stripe.com/mock',
    qr_code: session.qr_code, amount: plan.price_rub, description: plan.name,
  });
});

router.post('/confirm', async (req, res) => {
  const { session_id } = req.body;
  const session = await db.findById('payment_sessions', session_id);
  if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

  const plan = PLANS[session.plan_id];
  const account = await db.findById('accounts', session.user_id);
  account.vip = true;
  account.vip_until = new Date(Date.now() + plan.duration_days * 86400000).toISOString();
  await db.update('accounts', session.user_id, account);
  await db.update('payment_sessions', session_id, { status: 'completed' });

  // Achievement unlock
  await db.insert('achievements', {
    user_id: session.user_id, achievement_id: 'vip_status_1', name: 'VIP Статус',
    title: 'Призрачный Гонщик', description: 'Оформлена VIP-подписка',
    icon: 'crown', is_unlocked: true, unlocked_at: new Date().toISOString(),
  });

  res.json({ success: true, vip_until: account.vip_until });
});

router.get('/history', async (req, res) => {
  const sessions = await db.query('payment_sessions', { user_id: req.user.id });
  res.json({ success: true, sessions });
});

module.exports = router;
