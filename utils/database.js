const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

// 模拟书籍数据
const mockBooks = [
  {
    _id: { toString: () => '1' },
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
    _id: { toString: () => '2' },
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
  },
  {
    _id: { toString: () => '3' },
    title: '活着',
    author: '余华',
    cover: 'https://via.placeholder.com/150x200?text=活着',
    publisher: '作家出版社',
    publishDate: new Date('2012-08-01'),
    description: '《活着》是作家余华的代表作之一，讲述了在大时代背景下，随着内战、三反五反、大跃进、文化大革命等社会变革，徐福贵的人生和家庭不断经受着苦难。',
    category: '小说',
    fileUrl: '/books/huozhe.pdf',
    fileFormat: 'PDF',
    fileSize: 1589248,
    downloadCount: 203,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: { toString: () => '4' },
    title: '围城',
    author: '钱钟书',
    cover: 'https://via.placeholder.com/150x200?text=围城',
    publisher: '人民文学出版社',
    publishDate: new Date('1991-02-01'),
    description: '《围城》是钱钟书所著的长篇小说，是中国现代文学史上一部风格独特的讽刺小说，被誉为"新儒林外史"。',
    category: '小说',
    fileUrl: '/books/weicheng.pdf',
    fileFormat: 'PDF',
    fileSize: 1953792,
    downloadCount: 134,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: { toString: () => '5' },
    title: '平凡的世界',
    author: '路遥',
    cover: 'https://via.placeholder.com/150x200?text=平凡的世界',
    publisher: '北京十月文艺出版社',
    publishDate: new Date('2005-01-01'),
    description: '《平凡的世界》是中国作家路遥创作的一部百万字的小说，全景式地表现中国当代城乡社会生活。',
    category: '小说',
    fileUrl: '/books/pingfan.pdf',
    fileFormat: 'PDF',
    fileSize: 3145728,
    downloadCount: 178,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// 模拟用户数据
const mockUsers = [];

// 模拟下载历史数据
const mockDownloadHistory = [];

async function connectToDatabase() {
  // 如果是开发环境或没有 MongoDB URI，使用模拟数据
  if (process.env.NODE_ENV === 'development' || !process.env.MONGODB_URI) {
    console.log('🔧 开发模式：使用模拟数据');
    return {
      client: { 
        close: () => console.log('模拟数据库连接已关闭')
      },
      db: {
        collection: (name) => {
          if (name === 'books') {
            return {
              find: (query = {}) => {
                let books = [...mockBooks];
                
                // 应用查询条件
                if (query.isActive !== undefined) {
                  books = books.filter(book => book.isActive === query.isActive);
                }
                if (query.title && query.title.$regex) {
                  const searchTerm = query.title.$regex.toLowerCase();
                  books = books.filter(book => 
                    book.title.toLowerCase().includes(searchTerm)
                  );
                }
                if (query.author && query.author.$regex) {
                  const searchTerm = query.author.$regex.toLowerCase();
                  books = books.filter(book => 
                    book.author.toLowerCase().includes(searchTerm)
                  );
                }
                
                // 返回一个包含排序、限制和 toArray 方法的对象
                return {
                  sort: (sort) => {
                    let sortedBooks = [...books];
                    
                    // 应用排序
                    if (sort && sort.downloadCount === -1) {
                      sortedBooks.sort((a, b) => b.downloadCount - a.downloadCount);
                    }
                    if (sort && sort.createdAt === -1) {
                      sortedBooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    }
                    
                    return {
                      limit: (limit) => ({
                        toArray: () => {
                          let limitedBooks = sortedBooks;
                          if (limit) {
                            limitedBooks = sortedBooks.slice(0, limit);
                          }
                          return Promise.resolve(limitedBooks);
                        }
                      }),
                      toArray: () => Promise.resolve(sortedBooks)
                    };
                  },
                  toArray: () => Promise.resolve(books)
                };
              },
              findOne: (query) => {
                if (query._id) {
                  const book = mockBooks.find(b => b._id.toString() === query._id.toString());
                  return Promise.resolve(book || null);
                }
                return Promise.resolve(null);
              },
              insertOne: (data) => {
                const newId = (mockBooks.length + 1).toString();
                const newBook = {
                  ...data,
                  _id: { toString: () => newId },
                  createdAt: new Date(),
                  updatedAt: new Date()
                };
                mockBooks.push(newBook);
                return Promise.resolve({ insertedId: newId });
              },
              updateOne: (filter, update) => {
                const bookIndex = mockBooks.findIndex(b => 
                  b._id.toString() === filter._id.toString()
                );
                if (bookIndex !== -1) {
                  if (update.$inc && update.$inc.downloadCount) {
                    mockBooks[bookIndex].downloadCount += update.$inc.downloadCount;
                  }
                  if (update.$set) {
                    Object.assign(mockBooks[bookIndex], update.$set);
                  }
                  mockBooks[bookIndex].updatedAt = new Date();
                }
                return Promise.resolve({ modifiedCount: bookIndex !== -1 ? 1 : 0 });
              },
              createIndex: () => Promise.resolve(),
              countDocuments: () => Promise.resolve(mockBooks.length)
            };
          }
          
          if (name === 'users') {
            return {
              findOne: (query) => {
                if (query.username) {
                  const user = mockUsers.find(u => u.username === query.username);
                  return Promise.resolve(user || null);
                }
                if (query._id) {
                  const user = mockUsers.find(u => u._id.toString() === query._id.toString());
                  return Promise.resolve(user || null);
                }
                return Promise.resolve(null);
              },
              insertOne: (data) => {
                const newUser = {
                  ...data,
                  _id: { toString: () => (mockUsers.length + 1).toString() },
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  downloadHistory: []
                };
                mockUsers.push(newUser);
                return Promise.resolve({ insertedId: newUser._id });
              },
              updateOne: (filter, update) => {
                const userIndex = mockUsers.findIndex(u => 
                  u._id.toString() === filter._id.toString()
                );
                if (userIndex !== -1) {
                  if (update.$push && update.$push.downloadHistory) {
                    if (!mockUsers[userIndex].downloadHistory) {
                      mockUsers[userIndex].downloadHistory = [];
                    }
                    mockUsers[userIndex].downloadHistory.push(update.$push.downloadHistory);
                  }
                  mockUsers[userIndex].updatedAt = new Date();
                }
                return Promise.resolve({ modifiedCount: userIndex !== -1 ? 1 : 0 });
              },
              createIndex: () => Promise.resolve()
            };
          }
          
          if (name === 'download_history') {
            return {
              insertOne: (data) => {
                const newHistory = {
                  ...data,
                  _id: { toString: () => (mockDownloadHistory.length + 1).toString() },
                  downloadDate: new Date()
                };
                mockDownloadHistory.push(newHistory);
                return Promise.resolve({ insertedId: newHistory._id });
              },
              find: (query) => ({
                sort: (sort) => ({
                  limit: (limit) => ({
                    toArray: () => {
                      let history = [...mockDownloadHistory];
                      if (query.userId) {
                        history = history.filter(h => 
                          h.userId.toString() === query.userId.toString()
                        );
                      }
                      if (sort && sort.downloadDate === -1) {
                        history.sort((a, b) => new Date(b.downloadDate) - new Date(a.downloadDate));
                      }
                      if (limit) {
                        history = history.slice(0, limit);
                      }
                      return Promise.resolve(history);
                    }
                  })
                })
              }),
              createIndex: () => Promise.resolve()
            };
          }
          
          // 其他集合返回空操作
          return {
            find: () => ({ 
              sort: () => ({
                limit: () => ({
                  toArray: () => Promise.resolve([])
                })
              }),
              toArray: () => Promise.resolve([])
            }),
            findOne: () => Promise.resolve(null),
            insertOne: () => Promise.resolve({ insertedId: 'mock_id' }),
            updateOne: () => Promise.resolve({ modifiedCount: 0 }),
            createIndex: () => Promise.resolve()
          };
        }
      }
    };
  }

  // 生产环境使用真实的 MongoDB 连接
  try {
    if (cachedClient && cachedDb) {
      return { client: cachedClient, db: cachedDb };
    }

    const uri = process.env.MONGODB_URI;
    
    // 移除过时的选项，使用现代配置
    const client = new MongoClient(uri);

    await client.connect();
    const db = client.db('book_download');
    
    cachedClient = client;
    cachedDb = db;
    
    console.log('✅ 成功连接到 MongoDB');
    return { client, db };
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error);
    throw error;
  }
}

// 集合名称常量
const COLLECTIONS = {
  USERS: 'users',
  BOOKS: 'books',
  DOWNLOAD_HISTORY: 'download_history'
};

module.exports = { connectToDatabase, COLLECTIONS };