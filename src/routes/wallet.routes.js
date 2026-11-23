const router = require('express').Router();
const db = require('../db');
const auth = require('../middlewares/auth');
const { bad, wrap } = require('../utils');

router.get('/wallet', auth(), wrap(async (q, s) => {
  const [u, txns] = await Promise.all([
    db.user.findUnique({ where: { id: q.user.id } }),
    db.txn.findMany({ where: { userId: q.user.id }, orderBy: { id: 'desc' }, take: 50 }),
  ]);
  s.json({ wallet: u.wallet, txns });
}));

router.post('/wallet/withdraw', auth(), wrap(async (q, s) => {
  const amount = Math.round(+q.body.amount);
  const u = await db.user.findUnique({ where: { id: q.user.id } });
  if (!(amount > 0) || amount > u.wallet) throw bad('Số tiền rút không hợp lệ');
  await db.$transaction([
    db.user.update({ where: { id: u.id }, data: { wallet: { decrement: amount } } }),
    db.txn.create({ data: { userId: u.id, type: 'WITHDRAW', amount } }),
  ]);
  s.json({ ok: true });
}));

module.exports = router;
