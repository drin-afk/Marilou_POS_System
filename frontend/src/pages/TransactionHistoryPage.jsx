import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  History,
  Search,
  Eye,
  Ban,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { apiRequest } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { formatPeso, formatDateTime } from '../utils/format'
import ReceiptModal from '../components/ReceiptModal'

export default function TransactionHistoryPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [feedback, setFeedback] = useState(null)

  const [viewingReceipt, setViewingReceipt] = useState(null)
  const [voidingTx, setVoidingTx] = useState(null)
  const [voidReason, setVoidReason] = useState('')
  const [voidError, setVoidError] = useState('')

  const dateRangeInvalid = dateFrom && dateTo && dateFrom > dateTo

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', search, dateFrom, dateTo, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (statusFilter) params.set('status', statusFilter)
      return apiRequest(`/transactions?${params.toString()}`)
    },
    enabled: !dateRangeInvalid,
  })

  const transactions = data?.transactions || []

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }) =>
      apiRequest(`/transactions/${id}/void`, {
        method: 'POST',
        body: JSON.stringify({ void_reason: reason }),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setVoidingTx(null)
      setVoidReason('')
      setVoidError('')
      setFeedback({ type: 'success', message: res.message })
    },
    onError: (err) => {
      setVoidError(err.message || 'Could not void transaction.')
    },
  })

  const handleConfirmVoid = (e) => {
    e.preventDefault()
    if (!voidReason.trim()) {
      setVoidError('Enter a reason for voiding this transaction.')
      return
    }
    voidMutation.mutate({
      id: voidingTx.id,
      reason: voidReason.trim(),
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Transaction History
            </h1>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? 'Review all store sales, search by receipt number or date, and view on-screen receipts'
                : 'Review your processed sales and reopen receipts'}
            </p>
          </div>
        </div>
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
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
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

      {/* Search & Date Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-5">
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
            Search Receipt #, Item, or Cashier
          </label>
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g., OR-20261107-0001 or Pancit Canton..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
            From Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold uppercase text-slate-500 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </select>
        </div>

        <div className="md:col-span-1">
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setDateFrom('')
              setDateTo('')
              setStatusFilter('')
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            Reset
          </button>
        </div>
      </div>

      {dateRangeInvalid && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <span>Invalid date range: Start date cannot be after end date.</span>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Receipt Number</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Cashier</th>
                <th className="py-3.5 px-4">Items</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Loading transaction history...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isVoided = tx.status === 'voided'
                  const totalQty = (tx.items || []).reduce(
                    (sum, i) => sum + i.quantity,
                    0
                  )

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isVoided ? 'bg-red-50/30 opacity-75' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {tx.receipt_number}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {formatDateTime(tx.created_at)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">
                        {tx.cashier?.full_name || 'Staff'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {totalQty} items
                        </span>{' '}
                        (
                        {(tx.items || [])
                          .slice(0, 2)
                          .map((i) => i.product_name)
                          .join(', ')}
                        {(tx.items || []).length > 2 ? '...' : ''})
                      </td>
                      <td className="py-3 px-4 text-xs text-amber-700 font-medium">
                        {Number(tx.discount_amount) > 0
                          ? `-${formatPeso(tx.discount_amount)}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {formatPeso(tx.total)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                            isVoided
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setViewingReceipt(tx)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View Receipt</span>
                        </button>

                        {isAdmin && !isVoided && (
                          <button
                            onClick={() => {
                              setVoidingTx(tx)
                              setVoidReason('')
                              setVoidError('')
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Void</span>
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

      {/* On-Screen Receipt Viewer Modal */}
      {viewingReceipt && (
        <ReceiptModal
          transaction={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Admin Void Confirmation Modal */}
      {voidingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-red-600 px-6 py-4 text-white">
              <h3 className="font-bold text-base">
                Void Transaction ({voidingTx.receipt_number})
              </h3>
              <button
                onClick={() => setVoidingTx(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmVoid} className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Voiding this sale will mark receipt{' '}
                <strong>{voidingTx.receipt_number}</strong> (
                {formatPeso(voidingTx.total)}) as <strong>VOIDED</strong>,
                restore the deducted product quantities back to stock, and
                exclude it from sales revenue totals.
              </p>

              {voidError && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
                  {voidError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Reason for Voiding *
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => {
                    setVoidReason(e.target.value)
                    setVoidError('')
                  }}
                  placeholder="e.g., Cashier punched wrong quantity / Customer canceled"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm focus:border-red-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidingTx(null)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voidMutation.isPending}
                  className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                >
                  {voidMutation.isPending
                    ? 'Voiding...'
                    : 'Confirm Void & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
