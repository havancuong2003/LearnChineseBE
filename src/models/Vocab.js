import mongoose from 'mongoose';

const VocabSchema = new mongoose.Schema(
  {
    zh: {
      type: String,
      required: true,
      trim: true
    },
    pinyin: {
      type: String,
      required: true,
      trim: true
    },
    vi: {
      type: String,
      required: true,
      trim: true
    },
    audio_url: {
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
VocabSchema.index({ zh: 1 });
VocabSchema.index({ vi: 1 });
VocabSchema.index({ source_tag: 1 });

export default mongoose.model('Vocab', VocabSchema);

