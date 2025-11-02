import express from 'express';
import Session from '../models/Session.js';
import Answer from '../models/Answer.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Tạo session mới
router.post('/', authenticate, async (req, res) => {
  try {
    const { mode } = req.body;

    if (!mode) {
      return res.status(400).json({ error: 'Vui lòng chọn chế độ học' });
    }

    const session = new Session({
      userId: req.userId,
      mode,
      summary: {
        total: 0,
        correct: 0,
        incorrect: 0
      }
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Gửi câu trả lời
router.post('/answers', authenticate, async (req, res) => {
  try {
    const { sessionId, questionId, questionType, userAnswer, correct } = req.body;

    if (!sessionId || !questionId || !userAnswer || correct === undefined) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    // Save answer
    const answer = new Answer({
      sessionId,
      questionId,
      questionType,
      userAnswer,
      correct
    });

    await answer.save();

    // Update session summary
    const session = await Session.findById(sessionId);
    if (session) {
      session.summary.total += 1;
      if (correct) {
        session.summary.correct += 1;
      } else {
        session.summary.incorrect += 1;
      }
      await session.save();
    }

    res.status(201).json(answer);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Hoàn thành session
router.put('/:id/complete', authenticate, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ error: 'Không tìm thấy session' });
    }

    if (session.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Không có quyền truy cập' });
    }

    session.completedAt = new Date();
    session.summary.score = Math.round(
      (session.summary.correct / session.summary.total) * 100
    );

    await session.save();
    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy lịch sử sessions của user
router.get('/my-sessions', authenticate, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

