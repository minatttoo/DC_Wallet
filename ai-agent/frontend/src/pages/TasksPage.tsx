import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Task, GoalCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '../types'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-700 text-gray-300',
  in_progress: 'bg-yellow-900 text-yellow-300',
  done: 'bg-green-900 text-green-300',
  skipped: 'bg-red-900 text-red-300',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-500',
  medium: 'text-yellow-500',
  high: 'text-red-500',
}

export default function TasksPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () =>
      api
        .get<{ tasks: Task[] }>('/tasks', {
          params: filter !== 'all' ? { status: filter } : {},
        })
        .then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Partial<Task>) => api.post('/tasks', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      setShowForm(false)
      toast.success('Task created!')
    },
    onError: () => toast.error('Failed to create task'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/tasks/${id}`, { status }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['tasks'] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted')
    },
  })

  const tasks = data?.tasks ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks</h1>
          <p className="text-sm text-gray-400 mt-1">Daily actions toward your goals</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'in_progress', 'done', 'skipped'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-brand-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showForm && (
        <TaskForm
          onSubmit={(body) => createMut.mutate(body)}
          onCancel={() => setShowForm(false)}
          isLoading={createMut.isPending}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="card py-12 text-center text-gray-400">No tasks found</div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task._id}
              className="card flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority.toUpperCase()}
                  </span>
                  <span className={`badge ${CATEGORY_COLORS[task.category]}`}>
                    {CATEGORY_LABELS[task.category]}
                  </span>
                </div>
                <p
                  className={`mt-0.5 font-medium ${
                    task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'
                  }`}
                >
                  {task.title}
                </p>
                {task.estimatedMinutes && (
                  <p className="text-xs text-gray-500">⏱ {task.estimatedMinutes} min</p>
                )}
              </div>

              <select
                value={task.status}
                onChange={(e) => updateMut.mutate({ id: task._id, status: e.target.value })}
                className={`rounded-full px-2 py-1 text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[task.status]}`}
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="skipped">Skipped</option>
              </select>

              <button
                onClick={() => deleteMut.mutate(task._id)}
                className="btn-ghost p-1 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (body: Partial<Task>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<GoalCategory>('software_engineering')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [estimatedMinutes, setEstimatedMinutes] = useState('')
  const [dueDate, setDueDate] = useState('')

  return (
    <div className="card border-brand-700 space-y-4">
      <h3 className="font-semibold">New Task</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-400">Title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Solve 3 LeetCode medium problems"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as GoalCategory)}
          >
            {(Object.keys(CATEGORY_LABELS) as GoalCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Priority</label>
          <select
            className="input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Estimated minutes</label>
          <input
            type="number"
            className="input"
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(e.target.value)}
            placeholder="30"
            min={1}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Due date</label>
          <input
            type="date"
            className="input"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary"
          disabled={!title || isLoading}
          onClick={() =>
            onSubmit({
              title,
              category,
              priority,
              estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
              dueDate: dueDate || undefined,
            })
          }
        >
          {isLoading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}
