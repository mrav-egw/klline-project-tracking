import { NavLink, Outlet } from 'react-router-dom'
import { BarChart2, FolderOpen, LogOut, Truck, Wrench, Users, Building2, Package } from 'lucide-react'
import { useAuthStore } from '../store/auth'

const navItems = [
  { to: '/projekte', label: 'Projekte', icon: FolderOpen },
  { to: '/produkte', label: 'Produkte', icon: Package },
  { to: '/kunden', label: 'Kunden', icon: Building2 },
  { to: '/vertriebsbericht', label: 'Vertriebsbericht', icon: BarChart2 },
  { to: '/lieferanten', label: 'Lieferanten', icon: Truck },
  { to: '/monteure', label: 'Monteure', icon: Wrench },
  { to: '/benutzer', label: 'Benutzer', icon: Users },
]

export function Layout() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-56 flex-shrink-0 flex-col bg-gray-900 text-white">
        <div className="flex h-16 items-center px-6 border-b border-gray-700">
          <span className="text-lg font-bold tracking-tight">Klline</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-700 px-3 py-4">
          <div className="mb-1 px-3 text-[10px] text-gray-600">Frontend: ffb3d84</div>
          <div className="mb-2 px-3 text-xs text-gray-400">{user?.full_name} ({user?.username})</div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <LogOut size={18} />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
