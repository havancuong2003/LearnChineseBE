import express from 'express';
import Session from '../models/Session.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Lấy thống kê tiến độ
router.get('/', authenticate, async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.userId });
    
    const totalSessions = sessions.length;
    const totalQuestions = sessions.reduce((sum, s) => sum + s.summary.total, 0);
    const totalCorrect = sessions.reduce((sum, s) => sum + s.summary.correct, 0);
    const totalIncorrect = sessions.reduce((sum, s) => sum + s.summary.incorrect, 0);
    
    const accuracy = totalQuestions > 0 
      ? Math.round((totalCorrect / totalQuestions) * 100) 
      : 0;

    // Stats by mode
    const modeStats = sessions.reduce((acc, s) => {
      if (!acc[s.mode]) {
        acc[s.mode] = { total: 0, correct: 0, incorrect: 0 };
      }
      acc[s.mode].total += s.summary.total;
      acc[s.mode].correct += s.summary.correct;
      acc[s.mode].incorrect += s.summary.incorrect;
      return acc;
    }, {});

    res.json({
      summary: {
        totalSessions,
        totalQuestions,
        totalCorrect,
        totalIncorrect,
        accuracy
      },
      modeStats
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

