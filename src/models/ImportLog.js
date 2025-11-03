import mongoose from 'mongoose';

const ImportLogSchema = new mongoose.Schema(
  {
    file: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      enum: ['vocabulary', 'reading-units', 'lessons', 'sentences'],
      required: true
    },
    mode: {
      type: String,
      enum: ['overwrite', 'append'],
      required: true
    },
    result: {
      total: {
        type: Number,
        default: 0
      },
      success: {
        type: Number,
        default: 0
      },
      failed: {
        type: Number,
        default: 0
      },
      errors: [{
        type: String
      }]
    }
  },
  {
    timestamps: true
  }
);

// Index
ImportLogSchema.index({ createdAt: -1 });

export default mongoose.model('ImportLog', ImportLogSchema);

