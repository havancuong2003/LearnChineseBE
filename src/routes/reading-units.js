import express from 'express';
import ReadingUnit from '../models/ReadingUnit.js';
import ReadingQuestion from '../models/ReadingQuestion.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách reading units
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

    const units = await ReadingUnit.find(query).sort({ createdAt: -1 });
    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy danh sách source_tag với số lượng unit
router.get('/units', async (req, res) => {
  try {
    const units = await ReadingUnit.aggregate([
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

    res.json(units);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy một unit kèm câu hỏi
router.get('/:id', async (req, res) => {
  try {
    const unit = await ReadingUnit.findById(req.params.id);
    if (!unit) {
      return res.status(404).json({ error: 'Không tìm thấy unit' });
    }

    const questions = await ReadingQuestion.find({ unitId: req.params.id });
    res.json({
      unit,
      questions
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy câu hỏi của unit (random theo độ khó)
router.get('/:id/questions', async (req, res) => {
  try {
    const { difficulty, count = 10 } = req.query;
    const query = { unitId: req.params.id };

    if (difficulty) {
      query.difficulty = difficulty;
    }

    const allQuestions = await ReadingQuestion.find(query).populate('unitId');
    
    // Random và limit
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    const questions = shuffled.slice(0, Number(count));

    // Remove answer from response và xử lý logic hiển thị câu hỏi
    const questionsWithoutAnswer = questions.map(q => {
      const unit = q.unitId;
      let displayQuestion = q.question;
      let questionContent = '';

      // Xử lý logic hiển thị câu hỏi dựa trên question_type và question content
      if (q.question_type === 'fill') {
        // Nếu là fill và question là "Viết thành câu tiếng trung" → hiển thị vi_paragraph
        if (q.question && q.question.toLowerCase().includes('tiếng trung')) {
          questionContent = unit.vi_paragraph;
          displayQuestion = 'Viết thành câu tiếng Trung:';
        }
        // Nếu là fill và question là "Viết thành câu tiếng việt" → hiển thị zh_paragraph
        else if (q.question && q.question.toLowerCase().includes('tiếng việt')) {
          questionContent = unit.zh_paragraph;
          displayQuestion = 'Viết thành câu tiếng Việt:';
        }
      } else if (q.question_type === 'mcq') {
        // MCQ: hiển thị cả zh_paragraph và vi_paragraph làm câu hỏi
        questionContent = {
          zh: unit.zh_paragraph,
          vi: unit.vi_paragraph
        };
        displayQuestion = q.question || 'Chọn đáp án đúng:';
      }

      return {
        _id: q._id,
        zh_paragraph: unit.zh_paragraph,
        vi_paragraph: unit.vi_paragraph,
        unitId: unit._id,
        question: displayQuestion,
        questionContent: questionContent,
        originalQuestion: q.question,
        options: q.options,
        question_type: q.question_type,
        difficulty: q.difficulty
      };
    });

    res.json(questionsWithoutAnswer);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Tạo reading unit mới (cần auth)
router.post('/', authenticate, async (req, res) => {
  try {
    const { unit_title, zh_paragraph, vi_paragraph, source_tag } = req.body;

    if (!unit_title || !zh_paragraph || !vi_paragraph) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const unit = new ReadingUnit({
      unit_title,
      zh_paragraph,
      vi_paragraph,
      source_tag: source_tag || ''
    });

    await unit.save();
    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Thêm câu hỏi vào unit (cần auth)
router.post('/:id/questions', authenticate, async (req, res) => {
  try {
    const { question, options, answer, question_type, difficulty } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const readingQuestion = new ReadingQuestion({
      unitId: req.params.id,
      question,
      options,
      answer: typeof answer === 'string' ? { text: answer } : answer,
      question_type: question_type || 'mcq',
      difficulty: difficulty || 'medium'
    });

    await readingQuestion.save();
    res.status(201).json(readingQuestion);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Chấm điểm bài đọc hiểu
router.post('/:id/grade', authenticate, async (req, res) => {
  try {
    const { answers } = req.body; // { questionId: userAnswer }
    
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Vui lòng gửi câu trả lời' });
    }

    const questionIds = Object.keys(answers);
    const questions = await ReadingQuestion.find({
      _id: { $in: questionIds },
      unitId: req.params.id
    });

    if (questions.length !== questionIds.length) {
      return res.status(400).json({ error: 'Một số câu hỏi không hợp lệ' });
    }

    let correctCount = 0;
    const results = questions.map(question => {
      const userAnswer = answers[question._id.toString()];
      let correct = false;
      let correctAnswerText = '';

      // Extract correct answer based on type
      if (question.answer && typeof question.answer === 'object') {
        correctAnswerText = question.answer.text || question.answer.value || '';
      } else if (question.answer) {
        correctAnswerText = question.answer.toString();
      }

      // Check answer based on question type
      if (question.question_type === 'mcq') {
        // For MCQ, exact match
        correct = userAnswer && userAnswer.trim() === correctAnswerText.trim();
      } else if (question.question_type === 'fill') {
        // For fill, exact match (case-insensitive)
        correct = userAnswer && userAnswer.trim().toLowerCase() === correctAnswerText.trim().toLowerCase();
      } else if (question.question_type === 'translate') {
        // For translate, case-insensitive partial match (more lenient)
        const userLower = (userAnswer || '').trim().toLowerCase();
        const correctLower = correctAnswerText.trim().toLowerCase();
        correct = userLower === correctLower || userLower.includes(correctLower) || correctLower.includes(userLower);
      }

      if (correct) correctCount++;

      return {
        questionId: question._id.toString(),
        question: question.question,
        userAnswer: userAnswer || '',
        correctAnswer: correctAnswerText,
        correct,
        question_type: question.question_type
      };
    });

    const total = questions.length;
    const score = Math.round((correctCount / total) * 100);

    res.json({
      score,
      total,
      correctCount,
      incorrectCount: total - correctCount,
      results
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

