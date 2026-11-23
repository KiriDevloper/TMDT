const express = require('express');
const { PORT } = require('./src/config');
const startAutoRelease = require('./src/jobs/autoRelease');

const app = express();
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
app.use('/api', require('./src/routes'));

startAutoRelease();
app.listen(PORT, () => console.log('ReWear chạy tại http://localhost:' + PORT));
