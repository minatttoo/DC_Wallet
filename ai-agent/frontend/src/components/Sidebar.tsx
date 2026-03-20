import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  Bot,
  CalendarClock,
  LogOut,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/goals', label: 'Goals', icon: Target },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/agent', label: 'AI Agent', icon: Bot },
  { to: '/routine', label: 'Routine', icon: CalendarClock },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-gray-800 bg-gray-900 p-4">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2 px-2">
        <Bot className="h-7 w-7 text-brand-500" />
        <span className="text-lg font-bold text-white">AI Agent</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-800 pt-4">
        <p className="truncate px-2 text-xs text-gray-500">{user?.email}</p>
        <button
          onClick={handleLogout}
          className="btn-ghost mt-2 w-full justify-start text-red-400 hover:text-red-300"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  )
}
