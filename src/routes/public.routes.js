const router = require('express').Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET, CARRIERS } = require('../config');
const { wrap } = require('../utils');
const { checkCoupon } = require('../services/pricing');
const { getSettings, sellerRate } = require('../services/settings');

router.get('/categories', wrap(async (q, s) => s.json(await db.category.findMany({ where: { active: true }, orderBy: { id: 'asc' } }))));
router.get('/shipping', (q, s) => s.json(CARRIERS));
router.get('/coupons/check', wrap(async (q, s) => {
  const { coupon, discount } = await checkCoupon(q.query.code, +q.query.amount || 0);
  s.json({ code: coupon.code, discount });
}));

// Phí và chính sách hiển thị khi đăng bán / ký gửi (có ưu đãi nếu là người bán mới)
router.get('/fees', wrap(async (q, s) => {
  const st = await getSettings();
  let rate = st.commission;
  try {
    const t = jwt.verify((q.headers.authorization || '').slice(7), SECRET);
    const u = await db.user.findUnique({ where: { id: t.id } });
    if (u) rate = sellerRate(u, st);
  } catch {}
  s.json({ commission: rate, baseCommission: st.commission, promo: rate < st.commission, newShopDays: st.newShopDays, consignCommission: st.consignCommission, consignDays: st.consignDays, shipDays: st.shipDays, holdHours: st.holdHours, carriers: CARRIERS });
}));
module.exports = router;
