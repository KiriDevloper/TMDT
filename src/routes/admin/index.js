const router = require('express').Router();
router.use(require('../../middlewares/auth')(['admin'])); // mọi route /api/admin/* chỉ dành cho quản trị viên
[
  require('./dashboard'), require('./products'), require('./orders'), require('./users'),
  require('./categories'), require('./promotions'), require('./disputes'), require('./reports'), require('./settings'),
].forEach(r => router.use(r));
module.exports = router;
