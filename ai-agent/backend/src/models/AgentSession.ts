import mongoose, { Document, Schema } from 'mongoose';
import { GoalCategory } from './Goal';

export interface IChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface IAgentSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: GoalCategory;
  title: string;
  messages: IChatMessage[];
  tokensUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const agentSessionSchema = new Schema<IAgentSession>(
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
    title: { type: String, required: true, default: 'New Session' },
    messages: { type: [chatMessageSchema], default: [] },
    tokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const AgentSession = mongoose.model<IAgentSession>('AgentSession', agentSessionSchema);
