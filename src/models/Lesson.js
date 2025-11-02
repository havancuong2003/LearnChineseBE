import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    source_tag: {
      type: String,
      trim: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
LessonSchema.index({ title: 1 });
LessonSchema.index({ source_tag: 1 });

export default mongoose.model('Lesson', LessonSchema);

