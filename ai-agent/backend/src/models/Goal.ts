import mongoose, { Document, Schema } from 'mongoose';

export type GoalCategory =
  | 'software_engineering'
  | 'faang_prep'
  | 'english_communication'
  | 'side_income'
  | 'health'
  | 'daily_routine';

export interface IMilestone {
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface IGoal extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: GoalCategory;
  title: string;
  description: string;
  targetDate?: Date;
  progress: number; // 0–100
  milestones: IMilestone[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { _id: false },
);

const goalSchema = new Schema<IGoal>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      required: true,
      enum: [
        'software_engineering',
        'faang_prep',
        'english_communication',
        'side_income',
        'health',
        'daily_routine',
      ],
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    targetDate: { type: Date },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    milestones: { type: [milestoneSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const Goal = mongoose.model<IGoal>('Goal', goalSchema);
