import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Tag,
  Banknote,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  PackageOpen,
} from 'lucide-react'
import { apiRequest } from '../services/api'
import { useCartStore } from '../stores/cartStore'
import { formatPeso } from '../utils/format'
import ReceiptModal from '../components/ReceiptModal'

export default function SalesPosPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [bannerError, setBannerError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [completedReceipt, setCompletedReceipt] = useState(null)

  const {
    items,
    discountType,
    discountValue,
    amountPaid,
    addItem,
    updateQuantity,
    removeItem,
    setDiscount,
    setAmountPaid,
    clearCart,
    getTotals,
  } = useCartStore()

  const totals = getTotals()

  // Fetch products
  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiRequest('/products'),
  })

  const products = data?.products || []
  const categories = ['All', ...(data?.categories || [])]

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' || p.category === selectedCategory
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    return matchesCategory && matchesSearch
  })

  const handleAddProduct = (product) => {
    setBannerError('')
    setSaveError('')
    const res = addItem(product)
    if (!res.ok) {
      setBannerError(res.message)
    }
  }

  // Handle Enter key in search box for barcode scanner / exact match
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter' && search.trim()) {
      e.preventDefault()
      const q = search.trim().toLowerCase()
      const exactBarcode = products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === q
      )
      if (exactBarcode) {
        handleAddProduct(exactBarcode)
        setSearch('')
      } else if (filteredProducts.length === 1) {
        handleAddProduct(filteredProducts[0])
        setSearch('')
      } else if (filteredProducts.length === 0) {
        setBannerError(`Product "${search.trim()}" not found.`)
      }
    }
  }

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: (payload) =>
      apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      setSaveError('')
      setBannerError('')
      clearCart()
      setCompletedReceipt(res.transaction)
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
    onError: (err) => {
      // Cart remains intact on screen with a Retry button (System Flow requirement)
      setSaveError(err.message || 'Could not save. Try again.')
    },
  })

  const handleConfirmSale = (e) => {
    if (e) e.preventDefault()
    setBannerError('')
    setSaveError('')

    if (items.length === 0) {
      setBannerError('Cart is empty. Please add at least one product.')
      return
    }

    if (totals.discountError) {
      setBannerError(totals.discountError)
      return
    }

    if (amountPaid === '' || Number(amountPaid) < totals.total) {
      setBannerError(
        `Amount paid (${formatPeso(amountPaid || 0)}) must be at least equal to the total (${formatPeso(totals.total)}).`
      )
      return
    }

    checkoutMutation.mutate({
      items: items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
      })),
      discount_type: discountType,
      discount_value: Number(discountValue) || 0,
      amount_paid: Number(amountPaid),
    })
  }

  const quickBills = [20, 50, 100, 200, 500, 1000]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT PANEL: Product Catalog (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl shadow-xs border border-slate-200 p-4 sm:p-5 flex flex-col">
        {/* Search & Barcode Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search product name, category, or scan barcode (Press Enter)..."
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4 border-b border-slate-100">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            Loading store products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center">
            <PackageOpen className="mx-auto h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">
              No matching products found
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Try clearing your search or choosing another category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[65vh] overflow-y-auto pr-1">
            {filteredProducts.map((product) => {
              const inCartItem = items.find((i) => i.product_id === product.id)
              const inCartQty = inCartItem ? inCartItem.quantity : 0
              const remainingStock = product.stock_quantity - inCartQty
              const isOut = product.stock_quantity <= 0

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleAddProduct(product)}
                  disabled={isOut}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                    isOut
                      ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                      : 'border-slate-200 bg-white hover:border-emerald-500 hover:shadow-md cursor-pointer'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 truncate">
                        {product.category}
                      </span>
                      {inCartQty > 0 && (
                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {inCartQty} in cart
                        </span>
                      )}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-700">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                    <div>
                      <div className="text-sm sm:text-base font-extrabold text-emerald-700">
                        {formatPeso(product.price)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        per {product.unit || 'pc'}
                      </div>
                    </div>

                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                        isOut
                          ? 'bg-red-100 text-red-700'
                          : remainingStock <= 5
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {isOut ? 'Out of Stock' : `Stock: ${product.stock_quantity}`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Active Cart, Discount & Cash Payment (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-slate-200 flex flex-col overflow-hidden">
        {/* Cart Header */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-3.5 text-white">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-emerald-400" />
            <h2 className="font-bold text-sm sm:text-base">
              Current Sale Cart ({totals.itemCount} items)
            </h2>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={() => {
                clearCart()
                setBannerError('')
                setSaveError('')
              }}
              className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-red-600 hover:text-white transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Validation / Stock Alert Banner */}
        {bannerError && (
          <div className="mx-4 mt-3 flex items-start justify-between gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs font-medium text-amber-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{bannerError}</span>
            </div>
            <button
              onClick={() => setBannerError('')}
              className="text-amber-700 hover:text-amber-950 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Save Failure Banner with RETRY button (System Flow requirement) */}
        {saveError && (
          <div className="mx-4 mt-3 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-900">
                  Could not save transaction
                </p>
                <p className="mt-0.5">{saveError}</p>
                <p className="mt-1 text-[11px] text-red-600">
                  Your cart is safely preserved on screen and no stock was deducted.
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex justify-end">
              <button
                type="button"
                onClick={handleConfirmSale}
                disabled={checkoutMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Retry Saving Sale</span>
              </button>
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 px-4 py-2">
          {items.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <ShoppingCart className="mx-auto h-9 w-9 stroke-1 mb-1.5" />
              <p className="text-sm font-medium text-slate-500">
                Cart is empty
              </p>
              <p className="text-xs">
                Click any product on the left to add it to the sale.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const liveProduct = products.find((p) => p.id === item.product_id)
              const maxStock =
                liveProduct?.stock_quantity ?? item.stock_quantity

              return (
                <div
                  key={item.product_id}
                  className="flex items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatPeso(item.price)} / {item.unit || 'pc'} •{' '}
                      <span className="text-slate-400">Max: {maxStock}</span>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setBannerError('')
                        updateQuantity(
                          item.product_id,
                          item.quantity - 1,
                          maxStock
                        )
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>

                    <input
                      type="number"
                      min="1"
                      max={maxStock}
                      value={item.quantity}
                      onChange={(e) => {
                        setBannerError('')
                        const val = parseInt(e.target.value, 10)
                        if (Number.isNaN(val)) return
                        const res = updateQuantity(
                          item.product_id,
                          val,
                          maxStock
                        )
                        if (!res.ok) setBannerError(res.message)
                      }}
                      className="w-12 rounded-lg border border-slate-300 py-1 text-center text-xs font-bold"
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setBannerError('')
                        const res = updateQuantity(
                          item.product_id,
                          item.quantity + 1,
                          maxStock
                        )
                        if (!res.ok) setBannerError(res.message)
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-200 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Line Subtotal & Delete */}
                  <div className="flex items-center gap-2">
                    <div className="w-20 text-right text-xs sm:text-sm font-bold text-slate-900">
                      {formatPeso(item.price * item.quantity)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.product_id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      title="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Discount & Payment Section */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-4">
          {/* Discount Controls */}
          <div className="rounded-xl bg-white p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Tag className="h-3.5 w-3.5 text-emerald-600" />
                Discount (Optional)
              </span>
              <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'fixed', label: 'Fixed (₱)' },
                  { id: 'percentage', label: 'Percent (%)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setDiscount(opt.id, opt.id === 'none' ? 0 : discountValue)
                    }
                    className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
                      discountType === opt.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {discountType !== 'none' && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-semibold text-slate-500">
                  {discountType === 'fixed' ? '₱ Amount:' : '% Rate:'}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountValue}
                  onChange={(e) => setDiscount(discountType, e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold focus:border-emerald-600 focus:outline-none"
                />
                {totals.discountError && (
                  <span className="text-xs font-semibold text-red-600">
                    {totals.discountError}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Calculation Breakdown */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatPeso(totals.subtotal)}</span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-xs text-amber-700 font-medium">
                <span>Discount Applied:</span>
                <span>-{formatPeso(totals.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-200">
              <span className="text-sm font-extrabold uppercase text-slate-900">
                Total Due:
              </span>
              <span className="text-2xl font-black text-emerald-700">
                {formatPeso(totals.total)}
              </span>
            </div>
          </div>

          {/* Cash Tendered Input */}
          <div className="rounded-xl bg-white p-3 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Banknote className="h-4 w-4 text-emerald-600" />
                Cash Received (₱)
              </label>
              <button
                type="button"
                disabled={totals.total <= 0}
                onClick={() => setAmountPaid(String(totals.total))}
                className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
              >
                Exact ({formatPeso(totals.total)})
              </button>
            </div>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Enter cash amount paid..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-base font-bold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />

            {/* Quick Cash Denomination Buttons */}
            <div className="grid grid-cols-6 gap-1.5">
              {quickBills.map((bill) => (
                <button
                  key={bill}
                  type="button"
                  onClick={() => setAmountPaid(String(bill))}
                  className="rounded-lg border border-slate-200 bg-slate-50 py-1 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition cursor-pointer"
                >
                  ₱{bill}
                </button>
              ))}
            </div>

            {/* Change Computation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-bold uppercase text-slate-500">
                Change to Return:
              </span>
              <span
                className={`text-lg font-extrabold ${
                  amountPaid !== '' && Number(amountPaid) < totals.total
                    ? 'text-red-600'
                    : 'text-slate-900'
                }`}
              >
                {amountPaid !== '' && Number(amountPaid) < totals.total
                  ? 'Insufficient Cash'
                  : formatPeso(totals.change)}
              </span>
            </div>
          </div>

          {/* Pay & Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmSale}
            disabled={checkoutMutation.isPending || items.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span>
              {checkoutMutation.isPending
                ? 'Saving Transaction...'
                : `Confirm & Pay (${formatPeso(totals.total)})`}
            </span>
          </button>
        </div>
      </div>

      {/* On-Screen Receipt Modal */}
      {completedReceipt && (
        <ReceiptModal
          transaction={completedReceipt}
          onClose={() => setCompletedReceipt(null)}
        />
      )}
    </div>
  )
}
