const { connectToDatabase, COLLECTIONS } = require('../utils/database');

// 示例书籍数据
const sampleBooks = [
  {
    title: '三体',
    author: '刘慈欣',
    cover: 'https://via.placeholder.com/150x200?text=三体',
    publisher: '重庆出版社',
    publishDate: new Date('2008-01-01'),
    description: '《三体》是刘慈欣创作的系列长篇科幻小说，讲述了地球人类文明和三体文明的信息交流、生死搏杀及两个文明在宇宙中的兴衰历程。',
    category: '小说',
    fileUrl: '/books/santi.pdf',
    fileFormat: 'PDF',
    fileSize: 2048576,
    downloadCount: 156,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    cover: 'https://via.placeholder.com/150x200?text=百年孤独',
    publisher: '南海出版公司',
    publishDate: new Date('2011-06-01'),
    description: '《百年孤独》是哥伦比亚作家加西亚·马尔克斯创作的长篇小说，是魔幻现实主义的代表作，描写了布恩迪亚家族七代人的传奇故事。',
    category: '小说',
    fileUrl: '/books/bainiangudu.pdf',
    fileFormat: 'PDF',
    fileSize: 1859328,
    downloadCount: 89,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function initializeDatabase() {
  try {
    const { db } = await connectToDatabase();
    
    // 创建索引
    await db.collection(COLLECTIONS.USERS).createIndex({ username: 1 }, { unique: true });
    await db.collection(COLLECTIONS.BOOKS).createIndex({ title: 'text', author: 'text' });
    await db.collection(COLLECTIONS.BOOKS).createIndex({ category: 1 });
    await db.collection(COLLECTIONS.BOOKS).createIndex({ downloadCount: -1 });
    await db.collection(COLLECTIONS.DOWNLOAD_HISTORY).createIndex({ userId: 1, downloadDate: -1 });
    
    console.log('数据库索引创建成功');
    
    // 插入示例数据（仅在空数据库时）
    const booksCount = await db.collection(COLLECTIONS.BOOKS).countDocuments();
    if (booksCount === 0) {
      await db.collection(COLLECTIONS.BOOKS).insertMany(sampleBooks);
      console.log('示例书籍数据插入成功');
    }
    
    console.log('数据库初始化完成');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
}

// 如果是直接运行此文件，则执行初始化
if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;