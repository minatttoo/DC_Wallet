import mongoose, { Document, Schema } from 'mongoose';

export interface IDailyRoutineEntry {
  time: string; // e.g. "06:00"
  activity: string;
  durationMinutes: number;
  completed: boolean;
}

export interface IDailyRoutine extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  date: Date;
  entries: IDailyRoutineEntry[];
  overallScore: number; // 0–10 completion score
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const routineEntrySchema = new Schema<IDailyRoutineEntry>(
  {
    time: { type: String, required: true },
    activity: { type: String, required: true },
    durationMinutes: { type: Number, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false },
);

const dailyRoutineSchema = new Schema<IDailyRoutine>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true },
    entries: { type: [routineEntrySchema], default: [] },
    overallScore: { type: Number, default: 0, min: 0, max: 10 },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

dailyRoutineSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailyRoutine = mongoose.model<IDailyRoutine>('DailyRoutine', dailyRoutineSchema);
