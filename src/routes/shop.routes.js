const router = require('express').Router();
const db = require('../db');
const { wrap } = require('../utils');

router.get('/shops/:id', wrap(async (q, s) => {
  const id = +q.params.id;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!user) return s.status(404).json({ error: 'Không tìm thấy shop' });
  const [products, reviews] = await Promise.all([
    db.product.findMany({ where: { sellerId: id, status: 'APPROVED' }, include: { images: true } }),
    db.review.findMany({ where: { sellerId: id }, include: { author: { select: { name: true } } }, orderBy: { id: 'desc' } }),
  ]);
  s.json({ user, products, reviews });
}));

module.exports = router;
