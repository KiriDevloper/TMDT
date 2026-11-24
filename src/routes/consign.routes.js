const router = require('express').Router();
const db = require('../db');
const auth = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { CONDITIONS } = require('../config');
const { bad, wrap } = require('../utils');

// Gửi yêu cầu ký gửi: sàn nhận hàng, kiểm tra, chụp ảnh, đăng bán và giao hàng
router.post('/consignments', auth(), upload.array('images', 4), wrap(async (q, s) => {
  const b = q.body;
  for (const k of ['title', 'brand', 'size', 'measures', 'condition', 'category', 'expectedPrice']) if (!b[k]) throw bad('Thiếu thông tin: ' + k);
  if (!CONDITIONS.includes(b.condition)) throw bad('Tình trạng không hợp lệ');
  if (!(await db.category.findFirst({ where: { key: b.category, active: true } }))) throw bad('Danh mục không hợp lệ');
  if (!(+b.expectedPrice > 0)) throw bad('Giá mong muốn không hợp lệ');
  if (!q.files || q.files.length < 2) throw bad('Cần tối thiểu 2 ảnh để sàn đánh giá sơ bộ');
  s.json(await db.consignment.create({ data: {
    sellerId: q.user.id, title: b.title, brand: b.brand, size: b.size, measures: b.measures, category: b.category, condition: b.condition,
    expectedPrice: Math.round(+b.expectedPrice), description: b.description || '', images: q.files.map(f => '/uploads/' + f.filename).join(','),
  } }));
}));
router.get('/consignments', auth(), wrap(async (q, s) => s.json(await db.consignment.findMany({ where: { sellerId: q.user.id }, orderBy: { id: 'desc' } }))));
module.exports = router;
