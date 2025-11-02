import express from 'express';
import Vocab from '../models/Vocab.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Lấy danh sách từ vựng
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, search, source_tag, source_tags } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = {};
    if (search) {
      query.$or = [
        { zh: { $regex: search, $options: 'i' } },
        { vi: { $regex: search, $options: 'i' } },
        { pinyin: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter theo unit
    if (source_tag) {
      query.source_tag = source_tag;
    } else if (source_tags) {
      // Multiple units (comma-separated)
      const tags = source_tags.split(',').filter(Boolean);
      query.source_tag = { $in: tags };
    }

    const vocabs = await Vocab.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Vocab.countDocuments(query);

    res.json({
      vocabs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy danh sách units (source_tags)
router.get('/units', async (req, res) => {
  try {
    const units = await Vocab.distinct('source_tag', { source_tag: { $exists: true, $ne: null } });
    const unitsWithCount = await Promise.all(
      units.map(async (unit) => {
        const count = await Vocab.countDocuments({ source_tag: unit });
        return { unit, count };
      })
    );
    res.json(unitsWithCount.sort((a, b) => a.unit.localeCompare(b.unit)));
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Lấy một từ vựng
router.get('/:id', async (req, res) => {
  try {
    const vocab = await Vocab.findById(req.params.id);
    if (!vocab) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng' });
    }
    res.json(vocab);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Tạo từ vựng mới (cần auth)
router.post('/', authenticate, async (req, res) => {
  try {
    const { zh, pinyin, vi, audio_url, source_tag } = req.body;

    if (!zh || !pinyin || !vi) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
    }

    const vocab = new Vocab({
      zh,
      pinyin,
      vi,
      audio_url,
      source_tag
    });

    await vocab.save();
    res.status(201).json(vocab);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Cập nhật từ vựng (cần auth)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { zh, pinyin, vi, audio_url, source_tag } = req.body;

    const vocab = await Vocab.findByIdAndUpdate(
      req.params.id,
      { zh, pinyin, vi, audio_url, source_tag },
      { new: true, runValidators: true }
    );

    if (!vocab) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng' });
    }

    res.json(vocab);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

// Xóa từ vựng (cần auth)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const vocab = await Vocab.findByIdAndDelete(req.params.id);
    if (!vocab) {
      return res.status(404).json({ error: 'Không tìm thấy từ vựng' });
    }
    res.json({ message: 'Xóa thành công' });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

