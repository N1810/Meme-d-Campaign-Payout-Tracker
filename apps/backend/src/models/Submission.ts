import { Schema, model, Document, Types } from 'mongoose';
import { SubmissionStatus } from '../shared';

export interface ISubmission extends Document {
  _id: Types.ObjectId;
  campaign: Types.ObjectId;
  creator: Types.ObjectId;
  postUrl: string;
  views: number;
  eligiblePayoutPaise: number;
  paidAmountPaise: number;
  status: SubmissionStatus;
  spikeDetected: boolean;
  lastPayoutProcessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    campaign: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    postUrl: {
      type: String,
      required: true,
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'views must be an integer',
      },
    },
    eligiblePayoutPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'eligiblePayoutPaise must be an integer',
      },
    },
    paidAmountPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'paidAmountPaise must be an integer',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid'],
      default: 'pending',
      index: true,
    },
    spikeDetected: {
      type: Boolean,
      default: false,
    },
    lastPayoutProcessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate submissions by the same creator for the same campaign
SubmissionSchema.index({ campaign: 1, creator: 1 }, { unique: true });

export const Submission = model<ISubmission>('Submission', SubmissionSchema);
