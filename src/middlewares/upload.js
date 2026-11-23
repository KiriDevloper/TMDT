const multer = require('multer'), path = require('path'), fs = require('fs');
fs.mkdirSync('uploads', { recursive: true });

module.exports = multer({
  storage: multer.diskStorage({
    destination: 'uploads',
    filename: (r, f, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(f.originalname).toLowerCase()),
  }),
  limits: { fileSize: 5e6 },
  fileFilter: (r, f, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(f.mimetype)),
});
