const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');
const { CONDITIONS } = require('../../config');

router.get('/products', wrap(async (q, s) => {
  const { status, category, q: kw } = q.query, where = {};
  if (status) where.status = status;
  if (category) where.category = category;
  if (kw) where.title = { contains: kw, mode: 'insensitive' };
  s.json(await db.product.findMany({ where, orderBy: { id: 'desc' }, take: 300, include: { images: true, seller: { select: { id: true, name: true } } } }));
}));

// Sửa thông tin sản phẩm
router.patch('/products/:id', wrap(async (q, s) => {
  const b = q.body, data = {};
  for (const k of ['title', 'brand', 'size', 'measures', 'material', 'description', 'category']) if (b[k] !== undefined) data[k] = String(b[k]);
  if (b.price !== undefined) { if (!(+b.price > 0)) throw bad('Giá không hợp lệ'); data.price = Math.round(+b.price); }
  if (b.condition !== undefined) { if (!CONDITIONS.includes(b.condition)) throw bad('Tình trạng không hợp lệ'); data.condition = b.condition; }
  if (b.category && !(await db.category.findUnique({ where: { key: b.category } }))) throw bad('Danh mục không tồn tại');
  s.json(await db.product.update({ where: { id: +q.params.id }, data }));
}));

router.delete('/products/:id', wrap(async (q, s) => {
  if (await db.orderItem.count({ where: { productId: +q.params.id } })) throw bad('Sản phẩm đã có đơn hàng, hãy dùng chức năng Ẩn thay vì xóa');
  await db.product.delete({ where: { id: +q.params.id } });
  s.json({ ok: true });
}));

// Duyệt / từ chối / ẩn / hiện lại
router.post('/products/:id/:action', wrap(async (q, s) => {
  const status = { approve: 'APPROVED', reject: 'REJECTED', hide: 'HIDDEN', unhide: 'APPROVED' }[q.params.action];
  if (!status) throw bad('Thao tác không hợp lệ');
  const p = await db.product.findUnique({ where: { id: +q.params.id } });
  if (!p) throw bad('Không tìm thấy sản phẩm');
  if (['RESERVED', 'SOLD'].includes(p.status)) throw bad('Sản phẩm đang có đơn hoặc đã bán, không thể đổi trạng thái');
  await db.product.update({ where: { id: p.id }, data: { status } });
  s.json({ ok: true });
}));
module.exports = router;
