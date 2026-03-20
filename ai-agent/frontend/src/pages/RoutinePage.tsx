import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../services/api'
import { DailyRoutine } from '../types'
import toast from 'react-hot-toast'
import { Check, Clock, Plus, Trash2 } from 'lucide-react'

export default function RoutinePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [showForm, setShowForm] = useState(false)

  const { data, refetch } = useQuery({
    queryKey: ['routine', date],
    queryFn: () =>
      api.get<{ routine: DailyRoutine | null }>('/routines', { params: { date } }).then((r) => r.data),
  })

  const createMut = useMutation({
    mutationFn: (entries: DailyRoutine['entries']) =>
      api.post('/routines', { date, entries }),
    onSuccess: () => {
      void refetch()
      setShowForm(false)
      toast.success('Routine saved!')
    },
    onError: () => toast.error('Failed to save routine'),
  })

  const completeMut = useMutation({
    mutationFn: ({ entryIndex, completed }: { entryIndex: number; completed: boolean }) =>
      api.patch(`/routines/${data?.routine?._id}/complete`, { entryIndex, completed }),
    onSuccess: () => void refetch(),
  })

  const routine = data?.routine

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Daily Routine</h1>
          <p className="text-sm text-gray-400 mt-1">Track your disciplined daily schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            className="input w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {!routine && (
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" /> Create Routine
            </button>
          )}
        </div>
      </div>

      {/* Score */}
      {routine && (
        <div className="card flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-900 text-2xl font-bold text-brand-400">
            {routine.overallScore}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Today's Score</p>
            <p className="text-xs text-gray-400">
              {routine.entries.filter((e) => e.completed).length} / {routine.entries.length} completed
            </p>
          </div>
          <div className="flex-1 ml-4">
            <div className="h-2 rounded-full bg-gray-800">
              <div
                className="h-2 rounded-full bg-brand-500 transition-all"
                style={{
                  width: `${routine.entries.length > 0
                    ? (routine.entries.filter((e) => e.completed).length / routine.entries.length) * 100
                    : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <RoutineBuilder
          onSave={(entries) => createMut.mutate(entries)}
          onCancel={() => setShowForm(false)}
          isLoading={createMut.isPending}
        />
      )}

      {routine ? (
        <div className="space-y-2">
          {routine.entries.map((entry, i) => (
            <div
              key={i}
              className={`card flex items-center gap-4 transition-opacity ${
                entry.completed ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => completeMut.mutate({ entryIndex: i, completed: !entry.completed })}
                className={`h-6 w-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                  entry.completed
                    ? 'border-green-500 bg-green-500'
                    : 'border-gray-600 hover:border-brand-500'
                }`}
              >
                {entry.completed && <Check className="h-3.5 w-3.5 text-white" />}
              </button>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs text-gray-400 font-mono">{entry.time}</span>
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    entry.completed ? 'text-gray-500 line-through' : 'text-white'
                  }`}
                >
                  {entry.activity}
                </p>
                <p className="text-xs text-gray-500">{entry.durationMinutes} min</p>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="card py-12 text-center text-gray-400">
          <p>No routine set for {date}.</p>
          <button className="btn-primary mt-4" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Create today's routine
          </button>
        </div>
      ) : null}
    </div>
  )
}

const DEFAULT_ENTRIES = [
  { time: '06:00', activity: 'Wake up & morning exercise', durationMinutes: 30 },
  { time: '06:30', activity: 'Shower & breakfast', durationMinutes: 30 },
  { time: '07:00', activity: 'Deep work — software engineering / LeetCode', durationMinutes: 90 },
  { time: '08:30', activity: 'Work / job', durationMinutes: 480 },
  { time: '17:00', activity: 'Side project / income stream', durationMinutes: 60 },
  { time: '18:00', activity: 'English practice / reading', durationMinutes: 30 },
  { time: '18:30', activity: 'Exercise', durationMinutes: 45 },
  { time: '19:15', activity: 'Dinner', durationMinutes: 30 },
  { time: '20:00', activity: 'Deep work — system design / projects', durationMinutes: 90 },
  { time: '21:30', activity: 'Review day & plan tomorrow', durationMinutes: 30 },
  { time: '22:00', activity: 'Wind down / reading / meditation', durationMinutes: 60 },
]

function RoutineBuilder({
  onSave,
  onCancel,
  isLoading,
}: {
  onSave: (entries: { time: string; activity: string; durationMinutes: number }[]) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [entries, setEntries] = useState(DEFAULT_ENTRIES)

  function updateEntry(i: number, field: string, value: string | number) {
    setEntries((prev) => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)))
  }

  function removeEntry(i: number) {
    setEntries((prev) => prev.filter((_, idx) => idx !== i))
  }

  function addEntry() {
    setEntries((prev) => [...prev, { time: '00:00', activity: '', durationMinutes: 30 }])
  }

  return (
    <div className="card space-y-4 border-brand-700">
      <h3 className="font-semibold">Build Your Routine</h3>
      <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
        {entries.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="time"
              className="input w-24 flex-shrink-0"
              value={entry.time}
              onChange={(e) => updateEntry(i, 'time', e.target.value)}
            />
            <input
              className="input flex-1"
              placeholder="Activity"
              value={entry.activity}
              onChange={(e) => updateEntry(i, 'activity', e.target.value)}
            />
            <input
              type="number"
              className="input w-20 flex-shrink-0"
              placeholder="min"
              min={1}
              value={entry.durationMinutes}
              onChange={(e) => updateEntry(i, 'durationMinutes', Number(e.target.value))}
            />
            <button onClick={() => removeEntry(i)} className="btn-ghost p-1 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button className="btn-ghost text-xs" onClick={addEntry}>
        <Plus className="h-3.5 w-3.5" /> Add entry
      </button>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
        <button
          className="btn-primary"
          disabled={isLoading || entries.length === 0}
          onClick={() => onSave(entries)}
        >
          {isLoading ? 'Saving…' : 'Save Routine'}
        </button>
      </div>
    </div>
  )
}
