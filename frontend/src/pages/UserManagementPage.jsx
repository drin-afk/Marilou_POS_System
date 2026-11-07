import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  UserPlus,
  Edit3,
  Power,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { apiRequest } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { formatDateTime } from '../utils/format'

export default function UserManagementPage() {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [feedback, setFeedback] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    role: 'cashier',
    is_active: true,
  })
  const [formErrors, setFormErrors] = useState({})
  const [modalError, setModalError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiRequest('/users'),
  })

  const users = data?.users || []

  const openAddModal = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      full_name: '',
      password: '',
      role: 'cashier',
      is_active: true,
    })
    setFormErrors({})
    setModalError('')
    setIsModalOpen(true)
  }

  const openEditModal = (u) => {
    setEditingUser(u)
    setFormData({
      username: u.username,
      full_name: u.full_name,
      password: '',
      role: u.role,
      is_active: Boolean(u.is_active),
    })
    setFormErrors({})
    setModalError('')
    setIsModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingUser) {
        return apiRequest(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      }
      return apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsModalOpen(false)
      setFeedback({ type: 'success', message: res.message })
    },
    onError: (err) => {
      setModalError(err.message || 'Could not save user.')
      if (err.errors) setFormErrors(err.errors)
    },
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (userId) =>
      apiRequest(`/users/${userId}/toggle-status`, {
        method: 'PATCH',
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setFeedback({ type: 'success', message: res.message })
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.message || 'Could not update user status.',
      })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormErrors({})
    setModalError('')

    const errors = {}
    if (!formData.username.trim()) errors.username = 'Enter a username.'
    if (!formData.full_name.trim())
      errors.full_name = "Enter the user's full name."
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      errors.password = 'Enter a password (at least 6 characters).'
    }
    if (
      editingUser &&
      formData.password &&
      formData.password.length > 0 &&
      formData.password.length < 6
    ) {
      errors.password = 'New password must be at least 6 characters.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    saveMutation.mutate({
      username: formData.username.trim(),
      full_name: formData.full_name.trim(),
      password: formData.password || undefined,
      role: formData.role,
      is_active: Boolean(formData.is_active),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              User Management
            </h1>
            <p className="text-xs text-slate-500">
              Register new store accounts, manage roles, and activate or
              deactivate access
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add User</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl border p-3.5 text-sm ${
            feedback.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-red-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Full Name</th>
                <th className="py-3.5 px-4">Username</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Sales Recorded</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Created</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    Loading user accounts...
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = currentUser?.id === u.id
                  const isAdmin = u.role === 'admin'

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {u.full_name}
                        {isSelf && (
                          <span className="ml-2 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">
                        {u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold ${
                            isAdmin
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {isAdmin ? (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5" />
                          )}
                          <span>
                            {isAdmin ? 'Administrator' : 'Cashier'}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-semibold">
                        {u.transactions_count || 0} sales
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            u.is_active
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">
                        {formatDateTime(u.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        {!isSelf && (
                          <button
                            onClick={() => toggleStatusMutation.mutate(u.id)}
                            disabled={toggleStatusMutation.isPending}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold cursor-pointer ${
                              u.is_active
                                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            <span>
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </span>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
              <h2 className="font-bold text-base">
                {editingUser ? 'Edit User Account' : 'Register New User'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4"
              noValidate
            >
              {modalError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  placeholder="e.g., Charlene D. Palmero"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm ${
                    formErrors.full_name
                      ? 'border-red-500 bg-red-50/40'
                      : 'border-slate-300'
                  }`}
                />
                {formErrors.full_name && (
                  <p className="mt-1 text-xs text-red-600">
                    {Array.isArray(formErrors.full_name)
                      ? formErrors.full_name[0]
                      : formErrors.full_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  placeholder="e.g., charlene"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono ${
                    formErrors.username
                      ? 'border-red-500 bg-red-50/40'
                      : 'border-slate-300'
                  }`}
                />
                {formErrors.username && (
                  <p className="mt-1 text-xs text-red-600">
                    {Array.isArray(formErrors.username)
                      ? formErrors.username[0]
                      : formErrors.username}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  {editingUser
                    ? 'New Password (leave blank to keep current)'
                    : 'Password *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={
                    editingUser
                      ? 'Leave blank to keep existing password'
                      : 'Minimum 6 characters'
                  }
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm ${
                    formErrors.password
                      ? 'border-red-500 bg-red-50/40'
                      : 'border-slate-300'
                  }`}
                />
                {formErrors.password && (
                  <p className="mt-1 text-xs text-red-600">
                    {Array.isArray(formErrors.password)
                      ? formErrors.password[0]
                      : formErrors.password}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Role *
                  </label>
                  <select
                    value={formData.role}
                    disabled={editingUser && currentUser?.id === editingUser.id}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-100"
                  >
                    <option value="cashier">Cashier</option>
                    <option value="admin">Administrator (Owner)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={formData.is_active ? 'active' : 'inactive'}
                    disabled={editingUser && currentUser?.id === editingUser.id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        is_active: e.target.value === 'active',
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white disabled:bg-slate-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {saveMutation.isPending
                    ? 'Saving...'
                    : editingUser
                    ? 'Update User'
                    : 'Register User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
