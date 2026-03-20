import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User } from '../types'
import api from '../services/api'

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('ai_agent_token')
    const savedUser = localStorage.getItem('ai_agent_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser) as User)
    }
    setIsLoading(false)
  }, [])

  async function login(email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/login', { email, password })
    localStorage.setItem('ai_agent_token', data.token)
    localStorage.setItem('ai_agent_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await api.post<{ token: string; user: User }>('/auth/register', { name, email, password })
    localStorage.setItem('ai_agent_token', data.token)
    localStorage.setItem('ai_agent_user', JSON.stringify(data.user))
    setToken(data.token)
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('ai_agent_token')
    localStorage.removeItem('ai_agent_user')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
