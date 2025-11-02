import mongoose from 'mongoose';

const SentenceSchema = new mongoose.Schema(
  {
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      required: true
    },
    zh: {
      type: String,
      required: true,
      trim: true
    },
    vi: {
      type: String,
      required: true,
      trim: true
    },
    options: [{
      type: String,
      trim: true
    }],
    correctAnswer: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
SentenceSchema.index({ lessonId: 1 });

export default mongoose.model('Sentence', SentenceSchema);

