import express from 'express';
import Sentence from '../models/Sentence.js';
import Lesson from '../models/Lesson.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Lấy tất cả sentences với lesson info
router.get('/', async (req, res) => {
  try {
    const { limit = 10000, lessonId } = req.query;
    
    const query = {};
    if (lessonId) {
      query.lessonId = lessonId;
    }

    const sentences = await Sentence.find(query)
      .populate('lessonId', 'title description source_tag')
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    res.json({
      sentences: sentences || [],
      total: sentences.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

