const router = require('express').Router();
const db = require('../db');
const auth = require('../middlewares/auth');
const { bad, wrap } = require('../utils');
const { getOrder, release, refund } = require('../services/orderService');

router.use('/admin', auth(['admin'])); // mọi route /api/admin/* chỉ dành cho quản trị viên

router.get('/admin/products', wrap(async (q, s) =>
  s.json(await db.product.findMany({ where: { status: 'PENDING' }, include: { images: true, seller: { select: { name: true } } } }))));

router.post('/admin/products/:id/:action', wrap(async (q, s) => {
  const status = { approve: 'APPROVED', reject: 'REJECTED' }[q.params.action];
  if (!status) throw bad('Thao tác không hợp lệ');
  await db.product.update({ where: { id: +q.params.id }, data: { status } });
  s.json({ ok: true });
}));

router.get('/admin/disputes', wrap(async (q, s) => {
  const disputes = await db.dispute.findMany({
    where: { status: 'OPEN' },
    include: {
      order: {
        include: {
          items: { include: { product: true } },
          buyer: { select: { name: true } },
          seller: { select: { name: true } },
        },
      },
    },
  });
  s.json(disputes);
}));

router.post('/admin/disputes/:id/resolve', wrap(async (q, s) => {
  const d = await db.dispute.findUnique({ where: { id: +q.params.id } });
  if (!d || d.status !== 'OPEN') throw bad('Khiếu nại không hợp lệ');
  const decision = q.body.decision;
  if (!['REFUND', 'RELEASE'].includes(decision)) throw bad('Quyết định không hợp lệ');
  const o = await getOrder(d.orderId);
  await (decision === 'REFUND' ? refund(o) : release(o));
  await db.dispute.update({ where: { id: d.id }, data: { status: 'RESOLVED', decision } });
  s.json({ ok: true });
}));

module.exports = router;
