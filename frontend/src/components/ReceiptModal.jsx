import { CheckCircle2, X, AlertTriangle } from 'lucide-react'
import { formatPeso, formatDateTime } from '../utils/format'

export default function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null

  const isVoided = transaction.status === 'voided'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Banner */}
        <div
          className={`flex items-center justify-between px-6 py-4 text-white ${
            isVoided ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {isVoided ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            <span className="font-semibold tracking-wide">
              {isVoided ? 'VOIDED RECEIPT' : 'OFFICIAL DIGITAL RECEIPT'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white transition"
            title="Close Receipt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Receipt Body */}
        <div className="max-h-[80vh] overflow-y-auto p-6 font-mono text-sm text-slate-800">
          {/* Store Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
              Marilou Sari-Sari Store
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Neighborhood Retail & Daily Essentials
            </p>
            <div className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
              Receipt #: {transaction.receipt_number}
            </div>
          </div>

          {/* Metadata */}
          <div className="space-y-1 text-xs border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">Date & Time:</span>
              <span className="font-medium text-slate-800">
                {formatDateTime(transaction.created_at)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span className="font-medium text-slate-800">
                {transaction.cashier?.full_name || 'Store Staff'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="uppercase font-semibold text-slate-800">
                {transaction.payment_method || 'CASH'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span
                className={`font-bold uppercase ${
                  isVoided ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {transaction.status}
              </span>
            </div>
          </div>

          {isVoided && (
            <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-700 font-sans">
              <p className="font-semibold">Void Reason: {transaction.void_reason}</p>
              <p className="text-red-600 mt-0.5">
                Voided by: {transaction.voided_by_user?.full_name || 'Admin'} on{' '}
                {formatDateTime(transaction.voided_at)}
              </p>
            </div>
          )}

          {/* Line Items */}
          <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase pb-1.5 border-b border-slate-200 mb-2">
              <span>Item / Qty × Price</span>
              <span>Amount</span>
            </div>
            <div className="space-y-2.5">
              {(transaction.items || []).map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {item.product_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.quantity} {item.unit || 'pc'} ×{' '}
                      {formatPeso(item.price_at_sale)}
                    </div>
                  </div>
                  <div className="font-semibold text-slate-900 whitespace-nowrap">
                    {formatPeso(item.line_total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals Breakdown */}
          <div className="space-y-1.5 text-xs border-b border-dashed border-slate-300 pb-3 mb-4">
            <div className="flex justify-between">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-medium">{formatPeso(transaction.subtotal)}</span>
            </div>

            {Number(transaction.discount_amount) > 0 && (
              <div className="flex justify-between text-amber-700">
                <span>
                  Discount (
                  {transaction.discount_type === 'percentage'
                    ? `${Number(transaction.discount_value)}%`
                    : 'Fixed'}
                  ):
                </span>
                <span>-{formatPeso(transaction.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold text-slate-950 pt-1 border-t border-slate-200">
              <span>TOTAL:</span>
              <span>{formatPeso(transaction.total)}</span>
            </div>

            <div className="flex justify-between pt-1">
              <span className="text-slate-600">Cash Tendered:</span>
              <span className="font-medium">
                {formatPeso(transaction.amount_paid)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-bold text-emerald-700">
              <span>Change:</span>
              <span>{formatPeso(transaction.change_amount)}</span>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 font-sans">
            Thank you for buying at Marilou Sari-Sari Store!
          </p>
        </div>

        {/* Footer Button */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  )
}
