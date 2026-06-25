const mongoose = require('mongoose');

async function connectTestDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
}

async function clearTestDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

async function closeTestDb() {
  await mongoose.connection.close();
}

module.exports = { connectTestDb, clearTestDb, closeTestDb };
