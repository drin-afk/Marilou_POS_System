import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Calendar,
  TrendingUp,
  ShoppingBag,
  Tag,
  AlertTriangle,
  Database,
  Eye,
} from 'lucide-react'
import { apiRequest, downloadDatabaseBackup } from '../services/api'
import { formatPeso, formatDateTime } from '../utils/format'
import ReceiptModal from '../components/ReceiptModal'

export default function SalesReportsPage() {
  const [period, setPeriod] = useState('day') // 'day' | 'week' | 'month' | 'year'
  const [referenceDate, setReferenceDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [viewingReceipt, setViewingReceipt] = useState(null)
  const [backupMessage, setBackupMessage] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['reports', period, referenceDate],
    queryFn: () =>
      apiRequest(
        `/reports/sales?period=${period}&reference_date=${referenceDate}`
      ),
  })

  const summary = data?.summary || {
    total_sales: 0,
    total_subtotal: 0,
    total_discounts: 0,
    transaction_count: 0,
    total_items_sold: 0,
    voided_count: 0,
    voided_total: 0,
  }
  const quickTotals = data?.quick_totals || {
    day: 0,
    week: 0,
    month: 0,
    year: 0,
  }
  const topProducts = data?.top_products || []
  const lowStockProducts = data?.low_stock_products || []
  const transactions = data?.transactions || []

  const handleDownloadBackup = async () => {
    try {
      setBackupMessage('Preparing SQL backup...')
      await downloadDatabaseBackup()
      setBackupMessage('Database backup downloaded successfully.')
      setTimeout(() => setBackupMessage(''), 4000)
    } catch (err) {
      setBackupMessage(err.message || 'Backup failed.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Sales Reports</h1>
            <p className="text-xs text-slate-500">
              View store sales totals per Day, Week, Month, or Year
            </p>
          </div>
        </div>

        {/* Local SQL Backup Button (Option A Security/Backup Plan) */}
        <div className="flex items-center gap-2">
          {backupMessage && (
            <span className="text-xs font-semibold text-emerald-700">
              {backupMessage}
            </span>
          )}
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <Database className="h-4 w-4 text-emerald-600" />
            <span>Export Local DB Backup (.sql)</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar (Day, Week, Month, Year) */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          {[
            { id: 'day', label: 'Day' },
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'year', label: 'Year' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPeriod(tab.id)}
              className={`flex-1 sm:flex-initial rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
                period === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Calendar className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">
            Reference Date:
          </span>
          <input
            type="date"
            value={referenceDate}
            onChange={(e) => setReferenceDate(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-600 focus:outline-none"
          />
        </div>
      </div>

      {/* Active Period Banner */}
      <div className="rounded-2xl bg-slate-900 text-white p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Selected Period Summary
          </span>
          <h2 className="text-xl font-extrabold mt-1">
            {data?.period_label || 'Loading Report...'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Completed Sales: {summary.transaction_count} transactions •{' '}
            {summary.total_items_sold} units sold
          </p>
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs uppercase tracking-wider text-slate-400">
            Net Sales Revenue
          </div>
          <div className="text-3xl font-black text-emerald-400">
            {formatPeso(summary.total_sales)}
          </div>
        </div>
      </div>

      {/* 4 Quick Period Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>Today&apos;s Sales</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            {formatPeso(quickTotals.day)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>This Week</span>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            {formatPeso(quickTotals.week)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>This Month</span>
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            {formatPeso(quickTotals.month)}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between text-xs font-bold uppercase text-slate-400">
            <span>This Year</span>
            <Tag className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900">
            {formatPeso(quickTotals.year)}
          </div>
        </div>
      </div>

      {/* Top Selling Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Products in Selected Period */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Top Selling Products ({period.toUpperCase()})
          </h3>
          {topProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No sales recorded in this period.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {topProducts.map((item, idx) => (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        {item.product_name}
                      </div>
                      <div className="text-slate-400">
                        {item.total_qty} {item.unit || 'pc'} sold
                      </div>
                    </div>
                  </div>
                  <div className="font-bold text-emerald-700">
                    {formatPeso(item.total_revenue)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert Panel */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Low / Out-of-Stock Items (≤ 10 left)</span>
            </h3>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
              {lowStockProducts.length} items
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              All products are well stocked!
            </p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <div>
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-slate-400">{p.category}</div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-bold ${
                      p.stock_quantity === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {p.stock_quantity} {p.unit || 'pc'} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Period Transactions Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Transactions in Selected Period ({transactions.length})
          </h3>
          <div className="text-xs text-slate-500">
            Gross Subtotal: <strong>{formatPeso(summary.total_subtotal)}</strong>{' '}
            • Discounts: <strong>-{formatPeso(summary.total_discounts)}</strong>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Subtotal</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Calculating period report...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No sales recorded in this period.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                      {tx.receipt_number}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600">
                      {formatDateTime(tx.created_at)}
                    </td>
                    <td className="py-2.5 px-4 text-xs font-medium text-slate-700">
                      {tx.cashier?.full_name || 'Staff'}
                    </td>
                    <td className="py-2.5 px-4 text-xs">
                      {formatPeso(tx.subtotal)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-amber-700">
                      {Number(tx.discount_amount) > 0
                        ? `-${formatPeso(tx.discount_amount)}`
                        : '—'}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-emerald-700">
                      {formatPeso(tx.total)}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          tx.status === 'voided'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setViewingReceipt(tx)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingReceipt && (
        <ReceiptModal
          transaction={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  )
}
