const jwt = require('jsonwebtoken');
const db = require('../db');
const { SECRET } = require('../config');

// auth() yêu cầu đăng nhập; auth(['admin']) yêu cầu đúng vai trò. Tài khoản bị khóa không được dùng API.
module.exports = roles => async (q, s, n) => {
  try {
    const t = jwt.verify((q.headers.authorization || '').slice(7), SECRET);
    const u = await db.user.findUnique({ where: { id: t.id }, select: { id: true, role: true, status: true } });
    if (!u) return s.status(401).json({ error: 'Chưa đăng nhập' });
    if (u.status === 'banned') return s.status(403).json({ error: 'Tài khoản của bạn đã bị khóa' });
    if (roles && !roles.includes(u.role)) return s.status(403).json({ error: 'Không có quyền' });
    q.user = { id: u.id, role: u.role };
    n();
  } catch { s.status(401).json({ error: 'Chưa đăng nhập' }); }
};
