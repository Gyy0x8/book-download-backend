const express = require('express');
const cors = require('cors');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 健康检查
app.get('/', (req, res) => {
  res.json({ 
    message: '图书下载站 API 服务运行中', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 直接在这里引入路由，而不是作为单独的函数
app.use('/auth', require('./auth'));
app.use('/books', require('./books'));

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在', path: req.path });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  console.error('服务器错误:', error);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请联系管理员'
  });
});

// 导出为 Vercel Serverless Function
module.exports = app;
