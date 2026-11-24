const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');

// Báo cáo tin đăng vi phạm do người dùng gửi
router.get('/violations', wrap(async (q, s) => {
  const where = ['OPEN', 'RESOLVED'].includes(q.query.status) ? { status: q.query.status } : {};
  s.json(await db.violation.findMany({ where, orderBy: { id: 'desc' }, take: 200, include: { product: { include: { images: true, seller: { select: { name: true } } } }, reporter: { select: { name: true } } } }));
}));

router.post('/violations/:id/resolve', wrap(async (q, s) => {
  const v = await db.violation.findUnique({ where: { id: +q.params.id }, include: { product: true } });
  if (!v || v.status !== 'OPEN') throw bad('Báo cáo không hợp lệ hoặc đã xử lý');
  if (q.body.action === 'hide') {
    if (['RESERVED', 'SOLD'].includes(v.product.status)) throw bad('Sản phẩm đang có đơn hoặc đã bán, không thể gỡ');
    await db.product.update({ where: { id: v.productId }, data: { status: 'HIDDEN' } });
    await db.violation.updateMany({ where: { productId: v.productId, status: 'OPEN' }, data: { status: 'RESOLVED' } });
  } else if (q.body.action === 'dismiss') await db.violation.update({ where: { id: v.id }, data: { status: 'RESOLVED' } });
  else throw bad('Thao tác không hợp lệ');
  s.json({ ok: true });
}));
module.exports = router;
