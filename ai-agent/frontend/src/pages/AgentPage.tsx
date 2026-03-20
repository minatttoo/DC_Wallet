import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { AgentSession, GoalCategory, CATEGORY_LABELS } from '../types'
import toast from 'react-hot-toast'
import { Send, Plus, Bot, User as UserIcon, Sparkles } from 'lucide-react'

export default function AgentPage() {
  const qc = useQueryClient()
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [isReplying, setIsReplying] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: sessionsData } = useQuery({
    queryKey: ['agent-sessions'],
    queryFn: () => api.get<{ sessions: AgentSession[] }>('/agent/sessions').then((r) => r.data),
  })

  const createSessionMut = useMutation({
    mutationFn: (body: { category: GoalCategory; title: string }) =>
      api.post<{ session: AgentSession }>('/agent/sessions', body),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['agent-sessions'] })
      openSession(res.data.session)
    },
    onError: () => toast.error('Failed to create session'),
  })

  function openSession(session: AgentSession) {
    setSelectedSession(session)
    setMessages(session.messages ?? [])
  }

  async function loadAndOpenSession(id: string) {
    const res = await api.get<{ session: AgentSession }>(`/agent/sessions/${id}`)
    openSession(res.data.session)
  }

  async function handleSend() {
    if (!message.trim() || !selectedSession || isReplying) return
    const userMsg = message.trim()
    setMessage('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setIsReplying(true)

    try {
      const res = await api.post<{ reply: string }>(`/agent/sessions/${selectedSession._id}/chat`, {
        message: userMsg,
      })
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.reply }])
      void qc.invalidateQueries({ queryKey: ['agent-sessions'] })
    } catch {
      toast.error('AI service unavailable — check your OpenAI API key')
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setIsReplying(false)
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isReplying])

  const sessions = sessionsData?.sessions ?? []

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* Sessions sidebar */}
      <div className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-900 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">AI Sessions</p>
        </div>

        {/* New session buttons */}
        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {sessions.map((s) => (
            <button
              key={s._id}
              onClick={() => void loadAndOpenSession(s._id)}
              className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors ${
                selectedSession?._id === s._id
                  ? 'bg-brand-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`}
            >
              <p className="font-medium truncate">{s.title}</p>
              <p className="text-gray-500 text-[10px] mt-0.5">
                {CATEGORY_LABELS[s.category]}
              </p>
            </button>
          ))}
        </div>

        {/* Category quick-start */}
        <div className="p-2 border-t border-gray-800">
          <p className="text-[10px] text-gray-500 px-1 mb-1">New session</p>
          <div className="grid grid-cols-2 gap-1">
            {(Object.keys(CATEGORY_LABELS) as GoalCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() =>
                  createSessionMut.mutate({ category: cat, title: CATEGORY_LABELS[cat] })
                }
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
                title={CATEGORY_LABELS[cat]}
              >
                <Plus className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{cat.split('_')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-3">
              <Bot className="h-5 w-5 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-white">{selectedSession.title}</p>
                <p className="text-xs text-gray-500">{CATEGORY_LABELS[selectedSession.category]}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center text-gray-500">
                  <Sparkles className="h-10 w-10 text-brand-600" />
                  <p className="text-sm">
                    Start chatting with your AI mentor for{' '}
                    <span className="text-brand-400">{CATEGORY_LABELS[selectedSession.category]}</span>
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <MessageBubble key={i} role={m.role} content={m.content} />
              ))}
              {isReplying && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 flex-shrink-0 rounded-full bg-brand-700 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl bg-gray-800 px-4 py-3">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-800">
              <div className="flex gap-3">
                <textarea
                  className="input flex-1 resize-none min-h-[44px] max-h-32"
                  placeholder="Ask your AI mentor anything…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      void handleSend()
                    }
                  }}
                  rows={1}
                />
                <button
                  className="btn-primary px-3 self-end"
                  onClick={() => void handleSend()}
                  disabled={!message.trim() || isReplying}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-gray-600">Enter to send • Shift+Enter for new line</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center p-8">
            <Bot className="h-16 w-16 text-brand-700" />
            <h2 className="text-xl font-bold text-white">Personal AI Agent</h2>
            <p className="text-sm text-gray-400 max-w-sm">
              Select an existing session from the left panel, or start a new one by clicking a category.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center ${
          isUser ? 'bg-brand-600' : 'bg-gray-700'
        }`}
      >
        {isUser ? (
          <UserIcon className="h-4 w-4 text-white" />
        ) : (
          <Bot className="h-4 w-4 text-white" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-200 rounded-tl-sm'
        }`}
      >
        {content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}
