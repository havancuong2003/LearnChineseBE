import express from 'express';
import Vocab from '../models/Vocab.js';
import Sentence from '../models/Sentence.js';
import ReadingQuestion from '../models/ReadingQuestion.js';
import Session from '../models/Session.js';
import Answer from '../models/Answer.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Tạo bài test mới
router.post('/', authenticate, async (req, res) => {
  try {
    const { count = 50, vocabRatio = 0.4, lessonRatio = 0.3, readingRatio = 0.3 } = req.body;

    // Lấy random questions
    const totalVocab = Math.round(count * vocabRatio);
    const totalLesson = Math.round(count * lessonRatio);
    const totalReading = Math.round(count * readingRatio);

    // Get random vocabs
    const vocabCount = await Vocab.countDocuments();
    const vocabSampleSize = Math.min(totalVocab, vocabCount);
    const vocabs = await Vocab.aggregate([
      { $sample: { size: vocabSampleSize } }
    ]);

    // Get random sentences
    const sentenceCount = await Sentence.countDocuments();
    const sentenceSampleSize = Math.min(totalLesson, sentenceCount);
    const sentences = await Sentence.aggregate([
      { $sample: { size: sentenceSampleSize } }
    ]);

    // Get random reading questions
    const readingCount = await ReadingQuestion.countDocuments();
    const readingSampleSize = Math.min(totalReading, readingCount);
    const readingQuestions = await ReadingQuestion.aggregate([
      { $sample: { size: readingSampleSize } }
    ]);

    // Create session
    const session = new Session({
      userId: req.userId,
      mode: 'test',
      summary: {
        total: 0,
        correct: 0,
        incorrect: 0
      }
    });

    await session.save();

    // Build questions
    const questions = [];

    vocabs.forEach((vocab) => {
      questions.push({
        id: vocab._id,
        type: 'vocab',
        question: vocab.vi,
        correctAnswer: vocab.zh,
        pinyin: vocab.pinyin,
        options: null
      });
    });

    sentences.forEach((sentence) => {
      questions.push({
        id: sentence._id,
        type: 'sentence',
        question: sentence.zh,
        correctAnswer: sentence.vi,
        options: sentence.options || null
      });
    });

    readingQuestions.forEach((rq) => {
      questions.push({
        id: rq._id,
        type: 'reading',
        question: rq.question,
        correctAnswer: typeof rq.answer === 'object' ? rq.answer.text : rq.answer,
        options: rq.options || null
      });
    });

    // Shuffle questions
    const shuffled = questions.sort(() => 0.5 - Math.random()).slice(0, count);

    res.json({
      sessionId: session._id,
      questions: shuffled.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        pinyin: q.pinyin || null,
        options: q.options
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Nộp bài và chấm điểm
router.post('/:sessionId/submit', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers } = req.body; // [{ questionId, questionType, userAnswer }]

    const session = await Session.findById(sessionId);
    if (!session || session.userId.toString() !== req.userId) {
      return res.status(404).json({ error: 'Không tìm thấy session' });
    }

    let totalCorrect = 0;
    let totalIncorrect = 0;
    const detailedResults = [];

    // Chấm điểm từng câu
    for (const answer of answers) {
      let correct = false;
      let correctAnswer = '';

      if (answer.questionType === 'vocab') {
        const vocab = await Vocab.findById(answer.questionId);
        if (vocab) {
          correctAnswer = vocab.zh;
          correct = answer.userAnswer.trim() === vocab.zh.trim();
        }
      } else if (answer.questionType === 'sentence') {
        const sentence = await Sentence.findById(answer.questionId);
        if (sentence) {
          correctAnswer = sentence.correctAnswer || sentence.vi;
          // Check if multiple choice
          if (sentence.options && sentence.options.length > 0) {
            correct = answer.userAnswer === correctAnswer;
          } else {
            correct = answer.userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
          }
        }
      } else if (answer.questionType === 'reading') {
        const rq = await ReadingQuestion.findById(answer.questionId);
        if (rq) {
          correctAnswer = typeof rq.answer === 'object' ? rq.answer.text : rq.answer;
          correct = answer.userAnswer === correctAnswer || answer.userAnswer.trim() === correctAnswer.trim();
        }
      }

      // Save answer
      const answerDoc = new Answer({
        sessionId,
        questionId: answer.questionId,
        questionType: answer.questionType,
        userAnswer: answer.userAnswer,
        correct
      });
      await answerDoc.save();

      // Update stats
      if (correct) {
        totalCorrect++;
      } else {
        totalIncorrect++;
      }

      detailedResults.push({
        questionId: answer.questionId,
        questionType: answer.questionType,
        question: answer.question || '',
        userAnswer: answer.userAnswer,
        correctAnswer,
        correct
      });
    }

    // Update session
    session.summary.total = answers.length;
    session.summary.correct = totalCorrect;
    session.summary.incorrect = totalIncorrect;
    session.summary.score = Math.round((totalCorrect / answers.length) * 100);
    session.completedAt = new Date();
    await session.save();

    // Breakdown by type
    const breakdown = {
      vocab: { total: 0, correct: 0 },
      sentence: { total: 0, correct: 0 },
      reading: { total: 0, correct: 0 }
    };

    detailedResults.forEach(result => {
      breakdown[result.questionType].total++;
      if (result.correct) {
        breakdown[result.questionType].correct++;
      }
    });

    res.json({
      sessionId,
      score: session.summary.score,
      total: session.summary.total,
      correct: session.summary.correct,
      incorrect: session.summary.incorrect,
      breakdown,
      results: detailedResults
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

