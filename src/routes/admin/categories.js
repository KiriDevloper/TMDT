const router = require('express').Router();
const db = require('../../db');
const { bad, wrap } = require('../../utils');

router.get('/categories', wrap(async (q, s) => {
  const [cs, counts] = await Promise.all([db.category.findMany({ orderBy: { id: 'asc' } }), db.product.groupBy({ by: ['category'], _count: true })]);
  const c = Object.fromEntries(counts.map(x => [x.category, x._count]));
  s.json(cs.map(x => ({ ...x, products: c[x.key] || 0 })));
}));
router.post('/categories', wrap(async (q, s) => {
  const key = (q.body.key || '').trim().toLowerCase(), name = (q.body.name || '').trim();
  if (!/^[a-z0-9-]{2,30}$/.test(key)) throw bad('Mã danh mục chỉ gồm chữ thường không dấu, số, dấu gạch ngang (2-30 ký tự)');
  if (!name) throw bad('Cần nhập tên danh mục');
  if (await db.category.findUnique({ where: { key } })) throw bad('Mã danh mục đã tồn tại');
  s.json(await db.category.create({ data: { key, name } }));
}));
router.patch('/categories/:id', wrap(async (q, s) => {
  const data = {};
  if (q.body.name !== undefined) { if (!String(q.body.name).trim()) throw bad('Tên không được để trống'); data.name = String(q.body.name).trim(); }
  if (q.body.active !== undefined) data.active = !!q.body.active;
  s.json(await db.category.update({ where: { id: +q.params.id }, data }));
}));
router.delete('/categories/:id', wrap(async (q, s) => {
  const c = await db.category.findUnique({ where: { id: +q.params.id } });
  if (!c) throw bad('Không tìm thấy danh mục');
  if (await db.product.count({ where: { category: c.key } })) throw bad('Danh mục đang có sản phẩm, hãy chuyển sản phẩm sang danh mục khác hoặc tắt hiển thị');
  await db.category.delete({ where: { id: c.id } });
  s.json({ ok: true });
}));
module.exports = router;
