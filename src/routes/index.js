// Gom tất cả router, gắn vào /api
const router = require('express').Router();
[
  require('./auth.routes'),
  require('./public.routes'),
  require('./product.routes'),
  require('./shop.routes'),
  require('./order.routes'),
  require('./wallet.routes'),
  require('./message.routes'),
  require('./consign.routes'),
].forEach(r => router.use(r));
router.use('/admin', require('./admin')); // toàn bộ API quản trị, chỉ dành cho admin
module.exports = router;
