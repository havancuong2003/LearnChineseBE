import express from 'express';
import Sentence from '../models/Sentence.js';
import Lesson from '../models/Lesson.js';
import { authenticate } from '../middleware/auth.js';
import { generateAllSentences } from '../utils/sentenceGenerator.js';

const router = express.Router();

// Lấy tất cả sentences với lesson info
// Tự động sinh từ vocab và readingunit nếu không có trong bảng Sentence
router.get('/', async (req, res) => {
  try {
    const { limit = 10000, lessonId, useCache = 'true' } = req.query;
    
    let sentences = [];
    let source = 'generated';
    
    // Nếu có lessonId, tìm trong bảng Sentence trước
    if (lessonId) {
      const dbSentences = await Sentence.find({ lessonId })
        .populate('lessonId', 'title description source_tag')
        .limit(Number(limit))
        .sort({ createdAt: -1 });
      
      if (dbSentences.length > 0) {
        sentences = dbSentences;
        source = 'database';
      } else {
        // Không có trong database, sinh từ vocab và readingunit
        const generatedSentences = await generateAllSentences(Number(limit));
        // Filter by lessonId if needed
        sentences = generatedSentences.filter(s => {
          if (!s.lessonId) return false;
          const id = typeof s.lessonId === 'object' ? s.lessonId._id : s.lessonId;
          return String(id) === String(lessonId);
        });
      }
    } else {
      // Kiểm tra xem có sentences trong database không
      const dbSentenceCount = await Sentence.countDocuments();
      
      if (dbSentenceCount > 0 && useCache === 'true') {
        // Có data trong database, lấy từ database
        const dbSentences = await Sentence.find({})
          .populate('lessonId', 'title description source_tag')
          .limit(Number(limit))
          .sort({ createdAt: -1 });
        
        sentences = dbSentences;
        source = 'database';
      } else {
        // Không có data trong database hoặc force generate, sinh từ vocab và readingunit
        sentences = await generateAllSentences(Number(limit));
        source = 'generated';
      }
    }

    res.json({
      sentences: sentences || [],
      total: sentences.length,
      source: source
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

