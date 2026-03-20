import mongoose, { Document, Schema } from 'mongoose';
import { GoalCategory } from './Goal';

export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  goalId?: mongoose.Types.ObjectId;
  category: GoalCategory;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: Date;
  completedAt?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    goalId: { type: Schema.Types.ObjectId, ref: 'Goal' },
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
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done', 'skipped'],
      default: 'pending',
    },
    dueDate: { type: Date },
    completedAt: { type: Date },
    estimatedMinutes: { type: Number },
    actualMinutes: { type: Number },
  },
  { timestamps: true },
);

export const Task = mongoose.model<ITask>('Task', taskSchema);
