const jwt = require('jsonwebtoken');
const { SECRET } = require('../config');

// auth() yêu cầu đăng nhập; auth(['admin']) yêu cầu đúng vai trò
module.exports = roles => (q, s, n) => {
  try {
    const u = jwt.verify((q.headers.authorization || '').slice(7), SECRET);
    if (roles && !roles.includes(u.role)) return s.status(403).json({ error: 'Không có quyền' });
    q.user = u;
    n();
  } catch {
    s.status(401).json({ error: 'Chưa đăng nhập' });
  }
};
