const express = require('express');
const { connectToDatabase, COLLECTIONS } = require('../utils/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
const { ObjectId } = require('mongodb');

// 获取推荐书籍
router.get('/recommended', async (req, res) => {
  try {
    const { db } = await connectToDatabase();
    const booksCollection = db.collection(COLLECTIONS.BOOKS);

    // 修改这里：先获取数据，再手动过滤字段
    const books = await booksCollection
      .find({ isActive: true })
      .sort({ downloadCount: -1, createdAt: -1 })
      .limit(10)
      .toArray();

    // 手动排除 fileUrl 字段
    const formattedBooks = books.map(book => {
      const { fileUrl, ...bookWithoutFileUrl } = book;
      return {
        ...bookWithoutFileUrl,
        id: book._id ? book._id.toString() : book.id
      };
    });

    res.json(formattedBooks);

  } catch (error) {
    console.error('获取推荐书籍错误:', error);
    res.status(500).json({ error: '获取推荐书籍失败' });
  }
});

// 搜索书籍
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'title' } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({ error: '请输入搜索关键词' });
    }

    const { db } = await connectToDatabase();
    const booksCollection = db.collection(COLLECTIONS.BOOKS);

    let query = { isActive: true };
    
    if (type === 'title') {
      query.title = { $regex: q, $options: 'i' };
    } else if (type === 'author') {
      query.author = { $regex: q, $options: 'i' };
    }

    // 修改这里：先获取数据，再手动过滤字段
    const books = await booksCollection.find(query).toArray();

    // 手动排除 fileUrl 字段
    const formattedBooks = books.map(book => {
      const { fileUrl, ...bookWithoutFileUrl } = book;
      return {
        ...bookWithoutFileUrl,
        id: book._id ? book._id.toString() : book.id
      };
    });

    res.json(formattedBooks);

  } catch (error) {
    console.error('搜索错误:', error);
    res.status(500).json({ error: '搜索失败' });
  }
});

// 获取书籍详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 对于模拟数据，也允许字符串ID
    if (!id) {
      return res.status(400).json({ error: '无效的书籍ID' });
    }

    const { db } = await connectToDatabase();
    const booksCollection = db.collection(COLLECTIONS.BOOKS);

    let book;
    // 尝试作为 ObjectId 查询
    if (ObjectId.isValid(id)) {
      book = await booksCollection.findOne({ 
        _id: new ObjectId(id),
        isActive: true 
      });
    }
    
    // 如果没找到，尝试作为字符串ID查询（模拟数据）
    if (!book) {
      book = await booksCollection.findOne({ 
        $or: [
          { _id: { toString: () => id } },
          { id: id }
        ],
        isActive: true 
      });
    }

    if (!book) {
      return res.status(404).json({ error: '书籍未找到' });
    }

    // 格式化返回数据，排除 fileUrl
    const { fileUrl, ...bookWithoutFileUrl } = book;
    const formattedBook = {
      ...bookWithoutFileUrl,
      id: book._id ? book._id.toString() : book.id
    };

    res.json(formattedBook);

  } catch (error) {
    console.error('获取书籍详情错误:', error);
    res.status(500).json({ error: '获取书籍详情失败' });
  }
});

// 下载书籍（需要登录）
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    if (!id) {
      return res.status(400).json({ error: '无效的书籍ID' });
    }

    const { db } = await connectToDatabase();
    const booksCollection = db.collection(COLLECTIONS.BOOKS);
    const usersCollection = db.collection(COLLECTIONS.USERS);
    const downloadHistoryCollection = db.collection(COLLECTIONS.DOWNLOAD_HISTORY);

    // 查找书籍
    let book;
    if (ObjectId.isValid(id)) {
      book = await booksCollection.findOne({ 
        _id: new ObjectId(id),
        isActive: true 
      });
    }
    
    if (!book) {
      book = await booksCollection.findOne({ 
        $or: [
          { _id: { toString: () => id } },
          { id: id }
        ],
        isActive: true 
      });
    }

    if (!book) {
      return res.status(404).json({ error: '书籍未找到' });
    }

    // 更新下载计数
    await booksCollection.updateOne(
      { _id: book._id || { toString: () => book.id } },
      { $inc: { downloadCount: 1 } }
    );

    // 记录下载历史
    await downloadHistoryCollection.insertOne({
      userId: new ObjectId(userId),
      bookId: book._id || { toString: () => book.id },
      bookTitle: book.title,
      downloadDate: new Date()
    });

    // 添加到用户的下载历史
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $push: { 
          downloadHistory: {
            bookId: book._id || { toString: () => book.id },
            bookTitle: book.title,
            downloadDate: new Date()
          }
        } 
      }
    );

    res.json({
      status: 'success',
      message: '开始下载',
      downloadUrl: book.fileUrl,
      book: {
        id: book._id ? book._id.toString() : book.id,
        title: book.title,
        author: book.author,
        format: book.fileFormat,
        size: book.fileSize
      }
    });

  } catch (error) {
    console.error('下载错误:', error);
    res.status(500).json({ error: '下载失败' });
  }
});

// 获取用户下载历史
router.get('/user/downloads', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { db } = await connectToDatabase();
    const downloadHistoryCollection = db.collection(COLLECTIONS.DOWNLOAD_HISTORY);

    const downloads = await downloadHistoryCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ downloadDate: -1 })
      .limit(20)
      .toArray();

    const formattedDownloads = downloads.map(download => ({
      id: download._id ? download._id.toString() : download.id,
      bookId: download.bookId ? download.bookId.toString() : download.bookId,
      bookTitle: download.bookTitle,
      downloadDate: download.downloadDate
    }));

    res.json(formattedDownloads);

  } catch (error) {
    console.error('获取下载历史错误:', error);
    res.status(500).json({ error: '获取下载历史失败' });
  }
});

module.exports = router;