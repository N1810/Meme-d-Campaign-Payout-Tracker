import { Schema, model, Document, Types } from 'mongoose';
import { CampaignPlatform, CampaignStatus, Milestone } from '../shared';

export interface ICampaign extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  platform: CampaignPlatform;
  totalBudgetPaise: number;
  spentBudgetPaise: number;
  remainingBudgetPaise: number;
  milestones: Milestone[];
  status: CampaignStatus;
  brand: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MilestoneSchema = new Schema<Milestone>(
  {
    views: {
      type: Number,
      required: true,
      min: 1,
    },
    payoutPaise: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

const CampaignSchema = new Schema<ICampaign>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    platform: {
      type: String,
      enum: ['instagram', 'youtube'],
      required: true,
      index: true,
    },
    totalBudgetPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'totalBudgetPaise must be an integer',
      },
    },
    spentBudgetPaise: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'spentBudgetPaise must be an integer',
      },
    },
    milestones: {
      type: [MilestoneSchema],
      required: true,
      validate: {
        validator: function (val: Milestone[]) {
          if (!val || val.length === 0) return false;
          const views = val.map((m) => m.views);
          return new Set(views).size === views.length;
        },
        message: 'Campaign must have non-empty milestones with unique view thresholds',
      },
    },
    status: {
      type: String,
      enum: ['live', 'paused', 'completed'],
      default: 'live',
      index: true,
    },
    brand: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CampaignSchema.virtual('remainingBudgetPaise').get(function () {
  return Math.max(0, this.totalBudgetPaise - this.spentBudgetPaise);
});

// Ensure milestones are sorted ascending by view count before saving
CampaignSchema.pre('save', function (next) {
  if (this.milestones && Array.isArray(this.milestones)) {
    this.milestones.sort((a, b) => a.views - b.views);
  }
  next();
});

export const Campaign = model<ICampaign>('Campaign', CampaignSchema);
