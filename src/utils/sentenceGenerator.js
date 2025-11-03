import Vocab from '../models/Vocab.js';
import ReadingUnit from '../models/ReadingUnit.js';
import Lesson from '../models/Lesson.js';

// Split Chinese paragraph into sentences
function splitChineseParagraph(paragraph) {
  if (!paragraph || !paragraph.trim()) return [];
  
  // Split by Chinese punctuation marks: 。！？；, and newlines
  const sentences = paragraph
    .split(/[。！？；\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
}

// Split Vietnamese paragraph into sentences
function splitVietnameseParagraph(paragraph) {
  if (!paragraph || !paragraph.trim()) return [];
  
  // Split by Vietnamese punctuation marks: .!?; and newlines
  const sentences = paragraph
    .split(/[.!?；\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return sentences;
}

// Match Chinese and Vietnamese sentences by index (simple approach)
function matchSentences(zhSentences, viSentences) {
  const matched = [];
  const maxLength = Math.max(zhSentences.length, viSentences.length);
  
  for (let i = 0; i < maxLength; i++) {
    const zh = zhSentences[i] || '';
    const vi = viSentences[i] || '';
    
    if (zh.trim() && vi.trim()) {
      matched.push({ zh, vi });
    }
  }
  
  return matched;
}

// Generate sentences from ReadingUnit
export async function generateSentencesFromReadingUnits(limit = 10000) {
  try {
    // Get all reading units
    const readingUnits = await ReadingUnit.find({})
      .limit(1000) // Limit units to avoid too many
      .sort({ createdAt: -1 });
    
    const allSentences = [];
    const lessonCache = new Map(); // Cache lessons by source_tag
    
    for (const unit of readingUnits) {
      // Split paragraphs into sentences
      const zhSentences = splitChineseParagraph(unit.zh_paragraph);
      const viSentences = splitVietnameseParagraph(unit.vi_paragraph);
      
      // Match sentences
      const matchedSentences = matchSentences(zhSentences, viSentences);
      
      // Get or create lesson for this source_tag
      let lesson = null;
      if (unit.source_tag) {
        if (lessonCache.has(unit.source_tag)) {
          lesson = lessonCache.get(unit.source_tag);
        } else {
          // Try to find existing lesson by source_tag
          lesson = await Lesson.findOne({ source_tag: unit.source_tag });
          
          // If not found, create a new lesson
          if (!lesson) {
            lesson = new Lesson({
              title: unit.unit_title || `Bài ${unit.source_tag}`,
              description: `Bài học từ ${unit.unit_title || unit.source_tag}`,
              source_tag: unit.source_tag
            });
            await lesson.save();
          }
          
          lessonCache.set(unit.source_tag, lesson);
        }
      } else {
        // No source_tag, create a lesson with unit_title
        const lessonTitle = unit.unit_title || 'Bài không có tag';
        if (lessonCache.has(lessonTitle)) {
          lesson = lessonCache.get(lessonTitle);
        } else {
          lesson = await Lesson.findOne({ title: lessonTitle });
          if (!lesson) {
            lesson = new Lesson({
              title: lessonTitle,
              description: `Bài học từ ${unit.unit_title}`,
              source_tag: ''
            });
            await lesson.save();
          }
          lessonCache.set(lessonTitle, lesson);
        }
      }
      
      // Create sentence objects
      for (const matched of matchedSentences) {
        allSentences.push({
          lessonId: lesson ? {
            _id: lesson._id,
            title: lesson.title,
            description: lesson.description,
            source_tag: lesson.source_tag
          } : null,
          zh: matched.zh,
          vi: matched.vi,
          options: undefined,
          correctAnswer: undefined,
          _id: `gen_${unit._id}_${allSentences.length}`, // Temporary ID for client
          createdAt: unit.createdAt,
          updatedAt: unit.updatedAt
        });
        
        // Check limit
        if (allSentences.length >= limit) {
          return allSentences;
        }
      }
    }
    
    return allSentences;
  } catch (error) {
    console.error('Error generating sentences from reading units:', error);
    throw error;
  }
}

// Generate simple sentences from Vocab (optional, for future use)
export async function generateSentencesFromVocabs(limit = 1000) {
  try {
    const vocabs = await Vocab.find({})
      .limit(limit)
      .sort({ createdAt: -1 });
    
    const allSentences = [];
    const lessonCache = new Map();
    
    for (const vocab of vocabs) {
      // Create simple sentence from vocab (optional)
      // For now, we'll skip this and only use reading units
      // You can implement this later if needed
    }
    
    return allSentences;
  } catch (error) {
    console.error('Error generating sentences from vocabs:', error);
    throw error;
  }
}

// Main function to generate all sentences
export async function generateAllSentences(limit = 10000) {
  try {
    // Priority: ReadingUnits first (they have context)
    const readingUnitSentences = await generateSentencesFromReadingUnits(limit);
    
    // If we need more, we could add vocab-based sentences here
    // const vocabSentences = await generateSentencesFromVocabs(remainingLimit);
    
    return readingUnitSentences;
  } catch (error) {
    console.error('Error generating all sentences:', error);
    throw error;
  }
}

