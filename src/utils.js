const jwt = require('jsonwebtoken');
const { SECRET } = require('./config');

// Lỗi nghiệp vụ: trả 400 kèm thông báo cho người dùng
const bad = m => Object.assign(new Error(m), { expected: true });

// Bọc handler async để bắt lỗi tập trung
const wrap = f => (q, s, n) => f(q, s, n).catch(e => {
  if (e.expected) return s.status(400).json({ error: e.message });
  console.error(e);
  s.status(500).json({ error: 'Lỗi máy chủ' });
});

const sign = u => jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, wallet: u.wallet });

module.exports = { bad, wrap, sign, pub };
