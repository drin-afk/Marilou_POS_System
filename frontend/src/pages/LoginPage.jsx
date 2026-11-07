import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Lock, User, AlertCircle, LogIn } from 'lucide-react'
import { apiRequest } from '../services/api'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  const setSession = useAuthStore((s) => s.setSession)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    // Client-side missing field check
    const nextFieldErrors = {}
    if (!username.trim()) nextFieldErrors.username = 'Enter your username.'
    if (!password) nextFieldErrors.password = 'Enter your password.'

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      return
    }

    setIsLoading(true)
    try {
      const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      })

      setSession(data.token, data.user)
      navigate('/pos', { replace: true })
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
      if (err.errors) {
        setFieldErrors(err.errors)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fillQuickDemo = (demoUser, demoPass) => {
    setUsername(demoUser)
    setPassword(demoPass)
    setError('')
    setFieldErrors({})
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-7 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 shadow-lg">
            <Store className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Marilou Sari-Sari Store
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Point-of-Sale & Inventory Management System
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5" noValidate>
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (fieldErrors.username) {
                    setFieldErrors({ ...fieldErrors, username: null })
                  }
                }}
                placeholder="Enter username (e.g., admin or cashier)"
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                  fieldErrors.username
                    ? 'border-red-500 bg-red-50/40 focus:ring-red-500'
                    : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                }`}
                autoFocus
              />
            </div>
            {fieldErrors.username && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {Array.isArray(fieldErrors.username)
                  ? fieldErrors.username[0]
                  : fieldErrors.username}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) {
                    setFieldErrors({ ...fieldErrors, password: null })
                  }
                }}
                placeholder="Enter password"
                className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 transition ${
                  fieldErrors.password
                    ? 'border-red-500 bg-red-50/40 focus:ring-red-500'
                    : 'border-slate-300 bg-white focus:border-emerald-600 focus:ring-emerald-500/20'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="mt-1 text-xs font-medium text-red-600">
                {Array.isArray(fieldErrors.password)
                  ? fieldErrors.password[0]
                  : fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-60 transition cursor-pointer"
          >
            <LogIn className="h-4 w-4" />
            <span>{isLoading ? 'Signing in...' : 'Sign In to POS'}</span>
          </button>

          {/* Quick Account Fillers for Store Testing */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 text-center mb-2.5">
              Default Store Accounts (Click to Fill)
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => fillQuickDemo('admin', 'admin123')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-emerald-50 hover:border-emerald-300 transition cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-800">
                  Admin (Owner)
                </div>
                <div className="text-[11px] text-slate-500">
                  user: <code className="font-mono">admin</code> /{' '}
                  <code className="font-mono">admin123</code>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickDemo('cashier', 'cashier123')}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left hover:bg-emerald-50 hover:border-emerald-300 transition cursor-pointer"
              >
                <div className="text-xs font-bold text-slate-800">Cashier</div>
                <div className="text-[11px] text-slate-500">
                  user: <code className="font-mono">cashier</code> /{' '}
                  <code className="font-mono">cashier123</code>
                </div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
