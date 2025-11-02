import mongoose from 'mongoose';

const ReadingUnitSchema = new mongoose.Schema(
  {
    unit_title: {
      type: String,
      required: true,
      trim: true
    },
    zh_paragraph: {
      type: String,
      required: true
    },
    vi_paragraph: {
      type: String,
      required: true
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
ReadingUnitSchema.index({ unit_title: 1 });
ReadingUnitSchema.index({ source_tag: 1 });

export default mongoose.model('ReadingUnit', ReadingUnitSchema);

