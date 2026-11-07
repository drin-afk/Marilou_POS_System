import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { apiRequest } from '../services/api'
import { formatPeso } from '../utils/format'

const DEFAULT_UNITS = ['pc', 'pack', 'sachet', 'bottle', 'can', 'pouch', 'kg']
const DEFAULT_CATEGORIES = [
  'Instant Noodles',
  'Canned Goods',
  'Coffee & Milk',
  'Drinks & Beverages',
  'Condiments & Cooking',
  'Snacks & Biscuits',
  'Household & Personal Care',
]

export default function ProductManagementPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [feedback, setFeedback] = useState(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category: 'Canned Goods',
    unit: 'pc',
    price: '',
    stock_quantity: '',
  })
  const [formErrors, setFormErrors] = useState({})
  const [modalError, setModalError] = useState('')

  // Delete confirmation modal
  const [deletingProduct, setDeletingProduct] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => apiRequest('/products'),
  })

  const products = data?.products || []
  const categories = [
    'All',
    ...Array.from(
      new Set([...DEFAULT_CATEGORIES, ...(data?.categories || [])])
    ),
  ]

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

  const openAddModal = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      barcode: '',
      category: 'Canned Goods',
      unit: 'pc',
      price: '',
      stock_quantity: '0',
    })
    setFormErrors({})
    setModalError('')
    setIsModalOpen(true)
  }

  const openEditModal = (product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      barcode: product.barcode || '',
      category: product.category,
      unit: product.unit || 'pc',
      price: String(product.price),
      stock_quantity: String(product.stock_quantity),
    })
    setFormErrors({})
    setModalError('')
    setIsModalOpen(true)
  }

  const saveMutation = useMutation({
    mutationFn: (payload) => {
      if (editingProduct) {
        return apiRequest(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      }
      return apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setIsModalOpen(false)
      setFeedback({ type: 'success', message: res.message })
    },
    onError: (err) => {
      setModalError(err.message || 'Could not save. Try again.')
      if (err.errors) setFormErrors(err.errors)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (productId) =>
      apiRequest(`/products/${productId}`, { method: 'DELETE' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeletingProduct(null)
      setFeedback({ type: 'success', message: res.message })
    },
    onError: (err) => {
      setDeletingProduct(null)
      setFeedback({
        type: 'error',
        message: err.message || 'Could not delete product.',
      })
    },
  })

  const handleFormSubmit = (e) => {
    e.preventDefault()
    setFormErrors({})
    setModalError('')

    const errors = {}
    if (!formData.name.trim()) errors.name = 'Enter the product name.'
    if (!formData.category.trim()) errors.category = 'Enter a product category.'
    if (formData.price === '' || Number(formData.price) < 0) {
      errors.price =
        formData.price === ''
          ? 'Enter the product price.'
          : 'Product price cannot be negative.'
    }
    if (
      formData.stock_quantity === '' ||
      Number(formData.stock_quantity) < 0 ||
      !Number.isInteger(Number(formData.stock_quantity))
    ) {
      errors.stock_quantity =
        formData.stock_quantity === ''
          ? 'Enter the stock quantity.'
          : 'Stock quantity must be a whole number (0 or greater).'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    saveMutation.mutate({
      name: formData.name.trim(),
      barcode: formData.barcode.trim() || null,
      category: formData.category.trim(),
      unit: formData.unit.trim() || 'pc',
      price: Number(formData.price),
      stock_quantity: parseInt(formData.stock_quantity, 10),
    })
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Product & Stock Management
            </h1>
            <p className="text-xs text-slate-500">
              Add, edit, or remove store products and maintain stock quantities
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Product</span>
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

      {/* Search & Category Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, category, or barcode..."
            className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2 text-sm focus:border-emerald-600 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit</th>
                <th className="py-3.5 px-4">Price</th>
                <th className="py-3.5 px-4">Stock Quantity</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-slate-50/80 transition"
                  >
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {product.name}
                      </div>
                      {product.barcode && (
                        <div className="text-xs font-mono text-slate-400">
                          SKU/Barcode: {product.barcode}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {product.unit || 'pc'}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {formatPeso(product.price)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          product.stock_quantity === 0
                            ? 'bg-red-100 text-red-700'
                            : product.stock_quantity <= 10
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {product.stock_quantity === 0
                          ? '0 (Out of Stock)'
                          : `${product.stock_quantity} in stock`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => openEditModal(product)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setDeletingProduct(product)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
              <h2 className="font-bold text-base">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleFormSubmit}
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
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Lucky Me! Pancit Canton Chilimansi"
                  className={`w-full rounded-xl border px-3.5 py-2 text-sm ${
                    formErrors.name
                      ? 'border-red-500 bg-red-50/40'
                      : 'border-slate-300'
                  }`}
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">
                    {Array.isArray(formErrors.name)
                      ? formErrors.name[0]
                      : formErrors.name}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    list="category-options"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="Select or type category"
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm ${
                      formErrors.category
                        ? 'border-red-500 bg-red-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  <datalist id="category-options">
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {formErrors.category && (
                    <p className="mt-1 text-xs text-red-600">
                      {Array.isArray(formErrors.category)
                        ? formErrors.category[0]
                        : formErrors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm bg-white"
                  >
                    {DEFAULT_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Selling Price (₱) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    placeholder="0.00"
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm font-bold ${
                      formErrors.price
                        ? 'border-red-500 bg-red-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-xs text-red-600">
                      {Array.isArray(formErrors.price)
                        ? formErrors.price[0]
                        : formErrors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.stock_quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock_quantity: e.target.value,
                      })
                    }
                    placeholder="0"
                    className={`w-full rounded-xl border px-3.5 py-2 text-sm font-bold ${
                      formErrors.stock_quantity
                        ? 'border-red-500 bg-red-50/40'
                        : 'border-slate-300'
                    }`}
                  />
                  {formErrors.stock_quantity && (
                    <p className="mt-1 text-xs text-red-600">
                      {Array.isArray(formErrors.stock_quantity)
                        ? formErrors.stock_quantity[0]
                        : formErrors.stock_quantity}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Barcode / SKU (Optional)
                </label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) =>
                    setFormData({ ...formData, barcode: e.target.value })
                  }
                  placeholder="Optional barcode number"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm font-mono"
                />
                {formErrors.barcode && (
                  <p className="mt-1 text-xs text-red-600">
                    {Array.isArray(formErrors.barcode)
                      ? formErrors.barcode[0]
                      : formErrors.barcode}
                  </p>
                )}
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
                    : editingProduct
                    ? 'Save Changes'
                    : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Delete Product?
            </h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove{' '}
              <strong className="text-slate-900">{deletingProduct.name}</strong>{' '}
              from the active product catalog?
            </p>
            <p className="mt-2 rounded-lg bg-slate-100 p-2.5 text-[11px] text-slate-600">
              <strong>Rule 5 Protection:</strong> If this product appears in
              past sales, its historical transaction records and receipts will
              remain safely preserved.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                onClick={() => setDeletingProduct(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deletingProduct.id)}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                {deleteMutation.isPending ? 'Removing...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
