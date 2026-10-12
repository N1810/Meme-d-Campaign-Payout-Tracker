import { Schema, model, Document, Types } from 'mongoose';

export interface IPayoutLedger extends Document {
  _id: Types.ObjectId;
  submission: Types.ObjectId;
  campaign: Types.ObjectId;
  creator: Types.ObjectId;
  amountPaise: number;
  eligiblePayoutBeforePaise: number;
  eligiblePayoutAfterPaise: number;
  idempotencyKey: string;
  createdAt: Date;
}

const PayoutLedgerSchema = new Schema<IPayoutLedger>(
  {
    submission: {
      type: Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      index: true,
    },
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
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'amountPaise must be a positive integer',
      },
    },
    eligiblePayoutBeforePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    eligiblePayoutAfterPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

PayoutLedgerSchema.index({ campaign: 1, createdAt: -1 });
PayoutLedgerSchema.index({ creator: 1, createdAt: -1 });

export const PayoutLedger = model<IPayoutLedger>('PayoutLedger', PayoutLedgerSchema);
