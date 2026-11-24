const express = require('express');
const { PORT } = require('./src/config');
const startAutoRelease = require('./src/jobs/autoRelease');

const app = express();
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
app.use('/api', require('./src/routes'));

// Lỗi tải tệp (quá dung lượng...) và lỗi không bắt được
app.use((e, q, s, n) => {
  if (e.code === 'LIMIT_FILE_SIZE') return s.status(400).json({ error: 'Tệp quá lớn' });
  console.error(e); s.status(500).json({ error: 'Lỗi máy chủ' });
});

startAutoRelease();
app.listen(PORT, () => console.log('ReWear chạy tại http://localhost:' + PORT));
