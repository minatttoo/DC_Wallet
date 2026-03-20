import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Goal, GoalCategory, CATEGORY_LABELS, CATEGORY_COLORS } from '../types'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Check } from 'lucide-react'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as GoalCategory[]

export default function GoalsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<{ goals: Goal[] }>('/goals').then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (body: Partial<Goal>) => api.post('/goals', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] })
      setShowForm(false)
      toast.success('Goal created!')
    },
    onError: () => toast.error('Failed to create goal'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data: body }: { id: string; data: Partial<Goal> }) =>
      api.patch(`/goals/${id}`, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] })
      setEditGoal(null)
      toast.success('Goal updated!')
    },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['goals'] })
      toast.success('Goal archived')
    },
  })

  const goals = data?.goals ?? []

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Goals</h1>
          <p className="text-sm text-gray-400 mt-1">Track your 6 life goal areas</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {showForm && (
        <GoalForm
          onSubmit={(body) => createMut.mutate(body)}
          onCancel={() => setShowForm(false)}
          isLoading={createMut.isPending}
        />
      )}

      {isLoading ? (
        <LoadingSpinner />
      ) : goals.length === 0 ? (
        <EmptyGoals />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) =>
            editGoal?._id === goal._id ? (
              <GoalForm
                key={goal._id}
                initial={goal}
                onSubmit={(body) => updateMut.mutate({ id: goal._id, data: body })}
                onCancel={() => setEditGoal(null)}
                isLoading={updateMut.isPending}
              />
            ) : (
              <GoalCard
                key={goal._id}
                goal={goal}
                onEdit={() => setEditGoal(goal)}
                onDelete={() => deleteMut.mutate(goal._id)}
                onProgressChange={(p) => updateMut.mutate({ id: goal._id, data: { progress: p } })}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onProgressChange,
}: {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onProgressChange: (p: number) => void
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className={`badge ${CATEGORY_COLORS[goal.category]}`}>
          {CATEGORY_LABELS[goal.category]}
        </span>
        <div className="flex gap-1">
          <button onClick={onEdit} className="btn-ghost p-1">
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={onDelete} className="btn-ghost p-1 hover:text-red-400">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-white">{goal.title}</h3>
        {goal.description && (
          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{goal.description}</p>
        )}
      </div>

      {/* Progress slider */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-400">
          <span>Progress</span>
          <span>{goal.progress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={goal.progress}
          onChange={(e) => onProgressChange(Number(e.target.value))}
          className="w-full accent-brand-500"
        />
      </div>

      {/* Milestones */}
      {goal.milestones.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-400">Milestones</p>
          {goal.milestones.slice(0, 3).map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <Check
                className={`h-3 w-3 flex-shrink-0 ${m.completed ? 'text-green-400' : 'text-gray-600'}`}
              />
              <span className={m.completed ? 'text-gray-500 line-through' : 'text-gray-300'}>
                {m.title}
              </span>
            </div>
          ))}
          {goal.milestones.length > 3 && (
            <p className="text-xs text-gray-500">+{goal.milestones.length - 3} more</p>
          )}
        </div>
      )}
    </div>
  )
}

function GoalForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial?: Partial<Goal>
  onSubmit: (body: Partial<Goal>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [category, setCategory] = useState<GoalCategory>(initial?.category ?? 'software_engineering')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  return (
    <div className="card col-span-full space-y-4 border-brand-700">
      <h3 className="font-semibold">{initial ? 'Edit Goal' : 'New Goal'}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-400">Category</label>
          <select
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value as GoalCategory)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Master React performance optimisation"
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-400">Description</label>
          <textarea
            className="input min-h-[80px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does success look like?"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary"
          disabled={!title || isLoading}
          onClick={() => onSubmit({ category, title, description })}
        >
          {isLoading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  )
}

function EmptyGoals() {
  return (
    <div className="card flex flex-col items-center gap-3 py-12 text-center">
      <p className="text-gray-400">No goals yet. Add your first goal to get started.</p>
    </div>
  )
}
