import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Package,
  History,
  BarChart3,
  Users,
  LogOut,
  Store,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useCartStore } from '../stores/cartStore'

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const itemCount = useCartStore((s) =>
    s.items.reduce((acc, i) => acc + i.quantity, 0)
  )
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const navItems = [
    {
      to: '/pos',
      label: 'Sales / Cart',
      icon: ShoppingCart,
      badge: itemCount > 0 ? itemCount : null,
      roles: ['admin', 'cashier'],
    },
    {
      to: '/history',
      label: 'Transaction History',
      icon: History,
      roles: ['admin', 'cashier'],
    },
    {
      to: '/products',
      label: 'Products & Stock',
      icon: Package,
      roles: ['admin'],
    },
    {
      to: '/reports',
      label: 'Sales Reports',
      icon: BarChart3,
      roles: ['admin'],
    },
    {
      to: '/users',
      label: 'User Management',
      icon: Users,
      roles: ['admin'],
    },
  ].filter((item) => item.roles.includes(user?.role))

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 shadow-xs">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight sm:text-lg leading-tight">
                Marilou Sari-Sari Store
              </h1>
              <p className="text-xs text-slate-400">Point-of-Sale System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-emerald-500 text-slate-950 font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 rounded-full bg-slate-950 px-2 py-0.5 text-xs font-bold text-emerald-400">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-800/90 px-3 py-1.5 border border-slate-700">
              {isAdmin ? (
                <ShieldCheck className="h-4 w-4 text-amber-400" />
              ) : (
                <UserCheck className="h-4 w-4 text-emerald-400" />
              )}
              <div className="text-xs">
                <div className="font-semibold text-white">{user?.full_name}</div>
                <div className="uppercase tracking-wider text-[10px] text-slate-400">
                  {isAdmin ? 'Administrator (Owner)' : 'Cashier'}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl bg-red-500/15 border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-600 hover:text-white transition cursor-pointer"
              title="Log out of system"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile / Compact Nav Bar */}
        <div className="flex md:hidden overflow-x-auto border-t border-slate-800 px-3 py-2 gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`
                }
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="rounded-full bg-slate-900 px-1.5 py-0.2 text-[10px] text-emerald-400">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            )
          })}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
