import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { Goal, Task, CATEGORY_LABELS, CATEGORY_COLORS } from '../types'
import { useAuth } from '../context/AuthContext'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Target, CheckSquare, TrendingUp, Bot } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: goalsData } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<{ goals: Goal[] }>('/goals').then((r) => r.data),
  })

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () =>
      api
        .get<{ tasks: Task[] }>('/tasks', {
          params: { date: new Date().toISOString().slice(0, 10) },
        })
        .then((r) => r.data),
  })

  const goals = goalsData?.goals ?? []
  const todayTasks = tasksData?.tasks ?? []
  const doneTasks = todayTasks.filter((t) => t.status === 'done').length
  const avgProgress =
    goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0

  const chartData = goals.map((g) => ({
    name: CATEGORY_LABELS[g.category],
    value: g.progress,
    fill: '#3b82f6',
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.name} 👋</h1>
        <p className="mt-1 text-sm text-gray-400">Here's your progress overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Target className="h-5 w-5 text-blue-400" />}
          label="Active Goals"
          value={goals.length}
          sub="goals tracked"
        />
        <StatCard
          icon={<CheckSquare className="h-5 w-5 text-green-400" />}
          label="Today's Tasks"
          value={`${doneTasks}/${todayTasks.length}`}
          sub="completed today"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
          label="Avg Progress"
          value={`${avgProgress}%`}
          sub="across all goals"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Goal Progress Chart */}
        <div className="card">
          <h2 className="mb-4 text-sm font-semibold text-gray-300">Goal Progress</h2>
          {goals.length === 0 ? (
            <EmptyState
              message="No goals yet"
              action={{ label: 'Add a goal', to: '/goals' }}
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="80%"
                data={chartData}
              >
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: '#1f2937' }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                  formatter={(v: number) => [`${v}%`, 'Progress']}
                />
              </RadialBarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Today's tasks */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-300">Today's Tasks</h2>
            <Link to="/tasks" className="text-xs text-brand-400 hover:underline">
              View all
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyState message="No tasks for today" action={{ label: 'Add tasks', to: '/tasks' }} />
          ) : (
            <ul className="space-y-2">
              {todayTasks.slice(0, 6).map((t) => (
                <li key={t._id} className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 flex-shrink-0 rounded-full ${
                      t.status === 'done'
                        ? 'bg-green-500'
                        : t.status === 'in_progress'
                        ? 'bg-yellow-500'
                        : 'bg-gray-600'
                    }`}
                  />
                  <span
                    className={`flex-1 truncate text-sm ${
                      t.status === 'done' ? 'text-gray-500 line-through' : 'text-gray-200'
                    }`}
                  >
                    {t.title}
                  </span>
                  <span className={`badge ${CATEGORY_COLORS[t.category]}`}>
                    {t.category.split('_')[0]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Quick AI access */}
      <div className="card flex items-center gap-4">
        <Bot className="h-10 w-10 text-brand-500 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="font-semibold">Start an AI Session</h3>
          <p className="text-sm text-gray-400">Chat with your AI mentor for any of your 6 goal areas</p>
        </div>
        <Link to="/agent" className="btn-primary">
          Open AI Agent
        </Link>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub: string
}) {
  return (
    <div className="card flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
    </div>
  )
}

function EmptyState({ message, action }: { message: string; action: { label: string; to: string } }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-gray-500">{message}</p>
      <Link to={action.to} className="btn-primary text-xs">
        {action.label}
      </Link>
    </div>
  )
}
