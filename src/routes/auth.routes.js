const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middlewares/auth');
const { bad, wrap, sign, pub } = require('../utils');

router.post('/register', wrap(async (q, s) => {
  const { name, email, password } = q.body;
  if (!name || !email || !password || password.length < 6) throw bad('Nhập đủ thông tin, mật khẩu tối thiểu 6 ký tự');
  if (await db.user.findUnique({ where: { email } })) throw bad('Email đã được đăng ký');
  const u = await db.user.create({ data: { name, email, password: await bcrypt.hash(password, 10) } });
  s.json({ token: sign(u), user: pub(u) });
}));

router.post('/login', wrap(async (q, s) => {
  const u = await db.user.findUnique({ where: { email: q.body.email || '' } });
  if (!u || !(await bcrypt.compare(q.body.password || '', u.password))) throw bad('Sai email hoặc mật khẩu');
  s.json({ token: sign(u), user: pub(u) });
}));

router.get('/me', auth(), wrap(async (q, s) => s.json(pub(await db.user.findUnique({ where: { id: q.user.id } })))));

module.exports = router;
