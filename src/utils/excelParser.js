import XLSX from 'xlsx';
import Vocab from '../models/Vocab.js';
import ReadingUnit from '../models/ReadingUnit.js';
import ReadingQuestion from '../models/ReadingQuestion.js';

// Parse Vocabulary Excel
export const parseVocabularyExcel = async (filePath, mode) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const result = {
    total: data.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // Clear existing data if overwrite mode
  if (mode === 'overwrite') {
    await Vocab.deleteMany({});
  }

  // Import data
  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const zh = row['中文'] || row['zh'] || row['ZH'] || '';
      const pinyin = row['拼音'] || row['pinyin'] || row['Pinyin'] || '';
      const vi = row['越南语'] || row['vi'] || row['VI'] || row['Tiếng Việt'] || '';

      // Skip nếu thiếu tất cả thông tin cơ bản
      if (!zh && !pinyin && !vi) {
        result.failed++;
        result.errors.push(`Dòng ${i + 2}: Bỏ qua vì thiếu thông tin`);
      } else {
        const vocab = new Vocab({
          zh: zh || '',
          pinyin: pinyin || '',
          vi: vi || '',
          audio_url: row['audio_url'] || row['audio'] || '',
          source_tag: row['source_tag'] || row['Source Tag'] || row['unit'] || row['Unit'] || row['Bài'] || ''
        });

        await vocab.save();
        result.success++;
      }
    } catch (error) {
      result.failed++;
      result.errors.push(`Dòng ${i + 2}: ${error.message || 'Lỗi không xác định'}`);
    }
  }

  return result;
};

// Parse Reading Units Excel
export const parseReadingUnitsExcel = async (filePath, mode) => {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  const result = {
    total: data.length,
    success: 0,
    failed: 0,
    errors: []
  };

  // Clear existing data if overwrite mode
  if (mode === 'overwrite') {
    await ReadingUnit.deleteMany({});
    await ReadingQuestion.deleteMany({});
  }

  // Group by unit_title
  const unitsMap = new Map();

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      const unitTitle = row['unit_title'] || row['Unit Title'] || row['标题'] || '';
      const zhParagraph = row['zh_paragraph'] || row['中文段落'] || row['ZH Paragraph'] || '';
      const viParagraph = row['vi_paragraph'] || row['越南语段落'] || row['VI Paragraph'] || '';
      const sourceTag = row['source_tag'] || row['Source Tag'] || row['unit'] || row['Unit'] || row['Bài'] || '';

      // Skip nếu không có unitTitle
      if (!unitTitle) {
        result.failed++;
        result.errors.push(`Dòng ${i + 2}: Bỏ qua vì thiếu unit_title`);
      } else {
        // Create or get unit (chỉ lưu paragraph từ dòng đầu tiên của mỗi unit)
        let unit = unitsMap.get(unitTitle);
        if (!unit) {
          const existingUnit = await ReadingUnit.findOne({ unit_title: unitTitle });
          if (existingUnit && mode === 'append') {
            // Nếu mode append và unit đã tồn tại, giữ nguyên paragraph cũ
            unit = existingUnit;
          } else {
            // Tạo unit mới hoặc update nếu overwrite
            if (existingUnit && mode === 'overwrite') {
              // Update paragraph khi overwrite
              existingUnit.zh_paragraph = zhParagraph;
              existingUnit.vi_paragraph = viParagraph;
              if (sourceTag) {
                existingUnit.source_tag = sourceTag;
              }
              await existingUnit.save();
              unit = existingUnit;
            } else {
              // Tạo unit mới
              unit = new ReadingUnit({
                unit_title: unitTitle,
                zh_paragraph: zhParagraph,
                vi_paragraph: viParagraph,
                source_tag: sourceTag
              });
              await unit.save();
            }
          }
        }
        unitsMap.set(unitTitle, unit);

        // Create question if exists (chỉ tạo khi có unit hợp lệ)
        const question = row['question'] || row['Câu hỏi'] || row['question'];
        if (question) {
          // Parse options - có thể là JSON string hoặc từng cột riêng
          let options = [];
          const optionsValue = row['options'] || row['Options'];
          if (optionsValue) {
            try {
              // Thử parse JSON nếu là string
              if (typeof optionsValue === 'string' && optionsValue.trim().startsWith('[')) {
                options = JSON.parse(optionsValue);
              } else if (Array.isArray(optionsValue)) {
                options = optionsValue;
              }
            } catch (e) {
              // Nếu không phải JSON, thử parse từng cột
              options = [
                row['option1'] || row['option_1'] || row['Option1'],
                row['option2'] || row['option_2'] || row['Option2'],
                row['option3'] || row['option_3'] || row['Option3'],
                row['option4'] || row['option_4'] || row['Option4']
              ].filter(Boolean);
            }
          } else {
            // Nếu không có cột options, thử parse từng cột
            options = [
              row['option1'] || row['option_1'] || row['Option1'],
              row['option2'] || row['option_2'] || row['Option2'],
              row['option3'] || row['option_3'] || row['Option3'],
              row['option4'] || row['option_4'] || row['Option4']
            ].filter(Boolean);
          }

          // Parse answer - có thể là JSON string hoặc plain text
          let answer = row['answer'] || row['Đáp án'] || row['Answer'] || '';
          if (answer) {
            try {
              // Thử parse JSON nếu là string
              if (typeof answer === 'string' && answer.trim().startsWith('{')) {
                answer = JSON.parse(answer);
              } else if (typeof answer === 'object') {
                // Đã là object rồi
                answer = answer;
              } else {
                // Plain text, wrap trong object
                answer = { text: answer };
              }
            } catch (e) {
              // Nếu không parse được JSON, dùng làm plain text
              answer = { text: answer };
            }
          } else {
            // Nếu không có answer, dùng empty object
            answer = { text: '' };
          }

          let difficulty = row['difficulty'] || row['Độ khó'] || row['Difficulty'] || 'medium';
          let questionType = row['question_type'] || row['questionType'] || row['Question Type'] || row['QuestionType'] || 'mcq';

          // Validate question_type - dùng giá trị mặc định nếu không hợp lệ
          const validQuestionTypes = ['mcq', 'fill', 'translate'];
          if (!validQuestionTypes.includes(questionType)) {
            questionType = 'mcq';
            result.errors.push(`Dòng ${i + 2}: question_type không hợp lệ, dùng mặc định 'mcq'`);
          }

          // Validate difficulty - dùng giá trị mặc định nếu không hợp lệ
          const validDifficulties = ['easy', 'medium', 'hard'];
          if (!validDifficulties.includes(difficulty)) {
            difficulty = 'medium';
            result.errors.push(`Dòng ${i + 2}: difficulty không hợp lệ, dùng mặc định 'medium'`);
          }

          const readingQuestion = new ReadingQuestion({
            unitId: unit._id,
            question,
            options: options.length > 0 ? options : undefined,
            answer: answer,
            question_type: questionType,
            difficulty: difficulty
          });

          await readingQuestion.save();
        }
      }

      result.success++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Dòng ${i + 2}: ${error.message || 'Lỗi không xác định'}`);
    }
  }

  return result;
};

