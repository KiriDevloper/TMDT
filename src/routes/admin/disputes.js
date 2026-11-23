const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');
const { getOrder, release, refund } = require('../../services/orderService');

router.get('/disputes', wrap(async (q, s) => {
  const where = ['OPEN', 'RESOLVED'].includes(q.query.status) ? { status: q.query.status } : {};
  s.json(await db.dispute.findMany({ where, orderBy: { id: 'desc' }, include: { order: { include: { items: { include: { product: { include: { images: true } } } }, buyer: { select: { name: true, email: true } }, seller: { select: { name: true, email: true } } } } } }));
}));

router.post('/disputes/:id/resolve', wrap(async (q, s) => {
  const d = await db.dispute.findUnique({ where: { id: +q.params.id } });
  if (!d || d.status !== 'OPEN') throw bad('Khiếu nại không hợp lệ hoặc đã xử lý');
  const decision = q.body.decision;
  if (!['REFUND', 'RELEASE'].includes(decision)) throw bad('Quyết định không hợp lệ');
  const o = await getOrder(d.orderId);
  await (decision === 'REFUND' ? refund(o) : release(o));
  await db.dispute.update({ where: { id: d.id }, data: { status: 'RESOLVED', decision, note: (q.body.note || '').trim() || null } });
  s.json({ ok: true });
}));
module.exports = router;
