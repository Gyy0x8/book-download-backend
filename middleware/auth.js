const jwt = require('jsonwebtoken');
const { connectToDatabase, COLLECTIONS } = require('../utils/database');

module.exports = async (req, res, next) => {
  try {
    let token;
    
    // 从 Authorization header 获取 token
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: '请先登录' });
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 检查用户是否存在
    const { db } = await connectToDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);
    
    const user = await usersCollection.findOne({ 
      _id: new require('mongodb').ObjectId(decoded.userId) 
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 将用户信息添加到请求对象
    req.user = {
      userId: decoded.userId,
      username: decoded.username
    };

    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的认证令牌' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '认证令牌已过期' });
    }
    
    res.status(401).json({ error: '认证失败' });
  }
};