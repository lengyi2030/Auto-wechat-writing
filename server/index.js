require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const styleLoader = require('./services/styleLoader');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', require('./routes/article'));
app.use('/api', require('./routes/titles'));
app.use('/api', require('./routes/cover'));

// Get available styles
app.get('/api/styles', (req, res) => {
  res.json(styleLoader.getStyleList());
});

app.listen(PORT, () => {
  console.log(`\n  沃垠内容写作神器 已启动`);
  console.log(`  访问地址: http://localhost:${PORT}\n`);
});
