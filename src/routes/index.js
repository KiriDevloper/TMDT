// Gom tất cả router, gắn vào /api
const router = require('express').Router();
[
  require('./auth.routes'),
  require('./product.routes'),
  require('./shop.routes'),
  require('./order.routes'),
  require('./wallet.routes'),
  require('./admin.routes'),
].forEach(r => router.use(r));
module.exports = router;
