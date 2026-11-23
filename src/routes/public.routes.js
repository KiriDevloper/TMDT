const router = require('express').Router();
const db = require('../db');
const { wrap } = require('../utils');
const { checkCoupon } = require('../services/pricing');

router.get('/categories', wrap(async (q, s) => s.json(await db.category.findMany({ where: { active: true }, orderBy: { id: 'asc' } }))));
router.get('/coupons/check', wrap(async (q, s) => {
  const { coupon, discount } = await checkCoupon(q.query.code, +q.query.amount || 0);
  s.json({ code: coupon.code, discount });
}));
module.exports = router;
