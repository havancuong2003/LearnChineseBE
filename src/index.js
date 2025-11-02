import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import vocabRoutes from './routes/vocabs.js';
import lessonRoutes from './routes/lessons.js';
import sentenceRoutes from './routes/sentences.js';
import readingUnitRoutes from './routes/reading-units.js';
import sessionRoutes from './routes/sessions.js';
import adminRoutes from './routes/admin.js';
import progressRoutes from './routes/progress.js';
import testRoutes from './routes/tests.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
//const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/chinese-learning';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://havancuong07122003_db_user:DwUIitdz1qcO5KQS@learnchinese.nmqiryl.mongodb.net/';
// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/vocabs', vocabRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/sentences', sentenceRoutes);
app.use('/api/reading-units', readingUnitRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/tests', testRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Chinese Learning API is running' });
});

// MongoDB connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  });

