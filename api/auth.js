const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { connectToDatabase, COLLECTIONS } = require('../utils/database');

const router = express.Router();

// 用户注册
router.post('/register', async (req, res) => {
  let client;
  try {
    const { username, password, confirmPassword } = req.body;

    // 输入验证
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: '两次输入的密码不一致' });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ error: '用户名长度应在3-20个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6个字符' });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);

    // 检查用户是否存在
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const user = {
      username,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      downloadHistory: []
    };

    const result = await usersCollection.insertOne(user);
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: result.insertedId.toString(), username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      status: 'success',
      message: '注册成功',
      token,
      user: { 
        id: result.insertedId.toString(),
        username 
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ error: '注册失败，请稍后重试' });
  }
});

// 用户登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);

    // 查找用户
    const user = await usersCollection.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      status: 'success',
      message: '登录成功',
      token,
      user: {
        id: user._id.toString(),
        username: user.username
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
});

// 获取用户信息
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { db } = await connectToDatabase();
    const usersCollection = db.collection(COLLECTIONS.USERS);

    const user = await usersCollection.findOne(
      { _id: new require('mongodb').ObjectId(decoded.userId) },
      { projection: { password: 0 } } // 排除密码字段
    );

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({
      status: 'success',
      user: {
        id: user._id.toString(),
        username: user.username,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(401).json({ error: '认证无效' });
  }
});

module.exports = router;