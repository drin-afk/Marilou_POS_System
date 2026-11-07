import { useEffect } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ShieldAlert } from 'lucide-react'
import { useAuthStore } from './stores/authStore'
import AppLayout from './layouts/AppLayout'
import LoginPage from './pages/LoginPage'
import SalesPosPage from './pages/SalesPosPage'
import ProductManagementPage from './pages/ProductManagementPage'
import TransactionHistoryPage from './pages/TransactionHistoryPage'
import SalesReportsPage from './pages/SalesReportsPage'
import UserManagementPage from './pages/UserManagementPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="my-12 mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-xs border border-red-200">
        <ShieldAlert className="mx-auto h-12 w-12 text-red-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900">
          You do not have permission.
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Your role ({user.role}) is not allowed to access this module.
        </p>
      </div>
    )
  }

  return children
}

function SessionWatcher() {
  const clearSession = useAuthStore((s) => s.clearSession)
  const navigate = useNavigate()

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession()
      navigate('/login', { replace: true })
    }
    window.addEventListener('pos:unauthorized', handleUnauthorized)
    return () =>
      window.removeEventListener('pos:unauthorized', handleUnauthorized)
  }, [clearSession, navigate])

  return null
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionWatcher />
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to="/pos" replace /> : <LoginPage />
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/pos" replace />} />
            <Route path="pos" element={<SalesPosPage />} />
            <Route path="history" element={<TransactionHistoryPage />} />
            <Route
              path="products"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <ProductManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="reports"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <SalesReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
