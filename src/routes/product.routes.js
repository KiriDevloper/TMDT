const router = require('express').Router();
const db = require('../db');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { CONDITIONS } = require('../config');
const { bad, wrap } = require('../utils');
const { getSettings, bannedRegex } = require('../services/settings');
const { activeSales, withSale } = require('../services/pricing');

router.get('/products', wrap(async (q, s) => {
  const { q: kw, brand, size, condition, category, min, max, sort } = q.query;
  const where = { status: 'APPROVED' };
  if (kw) where.title = { contains: kw, mode: 'insensitive' };
  if (brand) where.brand = { contains: brand, mode: 'insensitive' };
  if (size) where.size = size;
  if (condition) where.condition = condition;
  if (category) where.category = category;
  if (min || max) where.price = { ...(min && { gte: +min }), ...(max && { lte: +max }) };
  const orderBy = sort === 'price_asc' ? { price: 'asc' } : sort === 'price_desc' ? { price: 'desc' } : { createdAt: 'desc' };
  const [ps, sales] = await Promise.all([db.product.findMany({ where, orderBy, include: { images: true } }), activeSales()]);
  s.json(ps.map(p => withSale(p, sales)));
}));

router.get('/products/:id', wrap(async (q, s) => {
  const p = await db.product.findUnique({ where: { id: +q.params.id }, include: { images: true, seller: { select: { id: true, name: true, shopStatus: true } } } });
  if (!p) return s.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  const r = await db.review.aggregate({ where: { sellerId: p.sellerId }, _avg: { rating: true }, _count: true });
  s.json({ ...withSale(p, await activeSales()), rating: r._avg.rating, reviews: r._count });
}));

router.post('/products', auth(), upload.array('images', 8), wrap(async (q, s) => {
  const b = q.body, st = await getSettings();
  const me = await db.user.findUnique({ where: { id: q.user.id } });
  if (me.shopStatus === 'rejected') throw bad('Shop của bạn không được xác minh nên không thể đăng bán');
  if (!q.files || q.files.length < st.minImages) throw bad(`Cần tối thiểu ${st.minImages} ảnh thật (mặt trước, mặt sau, nhãn mác, chi tiết lỗi)`);
  for (const k of ['title', 'brand', 'size', 'measures', 'condition', 'price']) if (!b[k]) throw bad('Thiếu thông tin: ' + k);
  if (!CONDITIONS.includes(b.condition)) throw bad('Tình trạng không hợp lệ');
  if (!(await db.category.findFirst({ where: { key: b.category, active: true } }))) throw bad('Danh mục không hợp lệ');
  if (!(+b.price > 0)) throw bad('Giá không hợp lệ');
  const re = bannedRegex(st);
  if (re && re.test(b.title + ' ' + (b.description || ''))) throw bad('Nội dung vi phạm chính sách hàng cấm (hàng giả, hàng nhái)');
  const p = await db.product.create({ data: {
    sellerId: q.user.id, title: b.title, brand: b.brand, size: b.size, measures: b.measures, material: b.material || '',
    condition: b.condition, category: b.category, price: Math.round(+b.price), description: b.description || '',
    images: { create: q.files.map(f => ({ url: '/uploads/' + f.filename })) },
  } });
  s.json(p); // trạng thái PENDING: chờ admin duyệt
}));

router.get('/my/products', auth(), wrap(async (q, s) =>
  s.json(await db.product.findMany({ where: { sellerId: q.user.id }, include: { images: true }, orderBy: { id: 'desc' } }))));

module.exports = router;
