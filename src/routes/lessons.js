import express from 'express';
import Lesson from '../models/Lesson.js';
import Sentence from '../models/Sentence.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách bài khóa
router.get('/', async (req, res) => {
  try {
    const { source_tag, source_tags } = req.query;
    const query = {};

    // Filter by source_tag
    if (source_tag) {
      query.source_tag = source_tag;
    } else if (source_tags) {
      // Multiple source_tags (comma-separated)
      const tags = source_tags.split(',').map(tag => tag.trim());
      query.source_tag = { $in: tags };
    }

    const lessons = await Lesson.find(query).sort({ createdAt: -1 });
    
    // Get sentence count for each lesson
    const lessonsWithCount = await Promise.all(
      lessons.map(async (lesson) => {
        const count = await Sentence.countDocuments({ lessonId: lesson._id });
        return {
          ...lesson.toObject(),
          sentenceCount: count
        };
      })
    );

    res.json(lessonsWithCount);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy danh sách source_tag với số lượng lesson
router.get('/units', async (req, res) => {
  try {
    const lessons = await Lesson.aggregate([
      {
        $group: {
          _id: '$source_tag',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          source_tag: { $ifNull: ['$_id', ''] },
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { source_tag: 1 }
      }
    ]);

    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy một bài khóa kèm câu
router.get('/:id', async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Không tìm thấy bài khóa' });
    }

    const sentences = await Sentence.find({ lessonId: req.params.id });
    res.json({
      lesson,
      sentences
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Tạo bài khóa mới (cần auth)
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, source_tag } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Vui lòng nhập tiêu đề' });
    }

    const lesson = new Lesson({
      title,
      description,
      source_tag: source_tag || ''
    });

    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Thêm câu vào bài khóa (cần auth)
router.post('/:id/sentences', authenticate, async (req, res) => {
  try {
    const { zh, vi, options, correctAnswer } = req.body;

    if (!zh || !vi) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const sentence = new Sentence({
      lessonId: req.params.id,
      zh,
      vi,
      options,
      correctAnswer
    });

    await sentence.save();
    res.status(201).json(sentence);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

