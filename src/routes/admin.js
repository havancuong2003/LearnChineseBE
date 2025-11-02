import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { parseVocabularyExcel, parseReadingUnitsExcel } from '../utils/excelParser.js';
import ImportLog from '../models/ImportLog.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Import Excel
router.post(
  '/import',
  authenticate,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Vui lòng chọn file' });
      }

      const { fileType, mode } = req.body;

      if (!fileType || !mode) {
        return res.status(400).json({ error: 'Vui lòng chọn loại file và chế độ import' });
      }

      if (!['overwrite', 'append'].includes(mode)) {
        return res.status(400).json({ error: 'Chế độ import không hợp lệ' });
      }

      let result;

      if (fileType === 'vocabulary') {
        result = await parseVocabularyExcel(req.file.path, mode);
      } else if (fileType === 'reading-units') {
        result = await parseReadingUnitsExcel(req.file.path, mode);
      } else {
        return res.status(400).json({ error: 'Loại file không được hỗ trợ' });
      }

      // Save import log
      const importLog = new ImportLog({
        file: req.file.originalname,
        fileType: fileType,
        mode: mode,
        result
      });

      await importLog.save();

      res.json({
        message: 'Import thành công',
        result,
        logId: importLog._id
      });
    } catch (error) {
      res.status(500).json({ error: error.message || 'Lỗi server' });
    }
  }
);

// Lấy danh sách import logs
router.get('/import-logs', authenticate, requireAdmin, async (req, res) => {
  try {
    const logs = await ImportLog.find()
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Lỗi server' });
  }
});

export default router;

