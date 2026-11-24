const multer = require('multer'), path = require('path'), fs = require('fs');
fs.mkdirSync('uploads', { recursive: true });
const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (r, f, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(f.originalname).toLowerCase()),
});

// Ảnh sản phẩm / ký gửi
module.exports = multer({ storage, limits: { fileSize: 5e6 }, fileFilter: (r, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype)) });
// Bằng chứng khiếu nại: ảnh hoặc video ngắn
module.exports.evidence = multer({ storage, limits: { fileSize: 25e6 }, fileFilter: (r, f, cb) => cb(null, /^(image\/(jpeg|png|webp)|video\/(mp4|webm))$/.test(f.mimetype)) });
