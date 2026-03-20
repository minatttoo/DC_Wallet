export type GoalCategory =
  | 'software_engineering'
  | 'faang_prep'
  | 'english_communication'
  | 'side_income'
  | 'health'
  | 'daily_routine'

export interface Milestone {
  title: string
  completed: boolean
  completedAt?: string
}

export interface Goal {
  _id: string
  userId: string
  category: GoalCategory
  title: string
  description: string
  targetDate?: string
  progress: number
  milestones: Milestone[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Task {
  _id: string
  userId: string
  goalId?: string
  category: GoalCategory
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'done' | 'skipped'
  dueDate?: string
  completedAt?: string
  estimatedMinutes?: number
  actualMinutes?: number
  createdAt: string
  updatedAt: string
}

export interface RoutineEntry {
  time: string
  activity: string
  durationMinutes: number
  completed: boolean
}

export interface DailyRoutine {
  _id: string
  userId: string
  date: string
  entries: RoutineEntry[]
  overallScore: number
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface AgentSession {
  _id: string
  userId: string
  category: GoalCategory
  title: string
  messages: ChatMessage[]
  tokensUsed: number
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
}

export const CATEGORY_LABELS: Record<GoalCategory, string> = {
  software_engineering: '🖥️ Software Engineering',
  faang_prep: '🎯 FAANG Prep',
  english_communication: '💬 English',
  side_income: '💰 Side Income',
  health: '💪 Health',
  daily_routine: '📅 Daily Routine',
}

export const CATEGORY_COLORS: Record<GoalCategory, string> = {
  software_engineering: 'bg-blue-900 text-blue-300',
  faang_prep: 'bg-purple-900 text-purple-300',
  english_communication: 'bg-green-900 text-green-300',
  side_income: 'bg-yellow-900 text-yellow-300',
  health: 'bg-red-900 text-red-300',
  daily_routine: 'bg-orange-900 text-orange-300',
}
