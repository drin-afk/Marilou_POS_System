import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      discountType: 'none', // 'none' | 'fixed' | 'percentage'
      discountValue: 0,
      amountPaid: '',

      addItem: (product) => {
        const currentItems = get().items
        const existingIndex = currentItems.findIndex(
          (item) => item.product_id === product.id
        )
        const currentQty =
          existingIndex >= 0 ? currentItems[existingIndex].quantity : 0

        if (product.stock_quantity <= 0) {
          return {
            ok: false,
            message: `"${product.name}" is out of stock.`,
          }
        }

        if (currentQty + 1 > product.stock_quantity) {
          return {
            ok: false,
            message: `Cannot add more "${product.name}". Only ${product.stock_quantity} ${product.unit} available in stock.`,
          }
        }

        if (existingIndex >= 0) {
          const updated = [...currentItems]
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: currentQty + 1,
            price: Number(product.price),
            stock_quantity: Number(product.stock_quantity),
          }
          set({ items: updated })
        } else {
          set({
            items: [
              ...currentItems,
              {
                product_id: product.id,
                name: product.name,
                category: product.category,
                unit: product.unit || 'pc',
                price: Number(product.price),
                stock_quantity: Number(product.stock_quantity),
                quantity: 1,
              },
            ],
          })
        }

        return { ok: true }
      },

      updateQuantity: (productId, newQty, maxStock) => {
        const qty = Number(newQty)
        if (Number.isNaN(qty) || qty <= 0) {
          set({
            items: get().items.filter((i) => i.product_id !== productId),
          })
          return { ok: true }
        }

        const item = get().items.find((i) => i.product_id === productId)
        const limit = maxStock ?? item?.stock_quantity ?? 0

        if (qty > limit) {
          return {
            ok: false,
            message: `Quantity cannot exceed available stock (${limit} ${item?.unit || 'pc'}).`,
          }
        }

        set({
          items: get().items.map((i) =>
            i.product_id === productId ? { ...i, quantity: qty } : i
          ),
        })
        return { ok: true }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((i) => i.product_id !== productId),
        })
      },

      setDiscount: (type, value) => {
        set({
          discountType: type,
          discountValue: Math.max(0, Number(value) || 0),
        })
      },

      setAmountPaid: (value) => {
        set({ amountPaid: value })
      },

      clearCart: () => {
        set({
          items: [],
          discountType: 'none',
          discountValue: 0,
          amountPaid: '',
        })
      },

      getTotals: () => {
        const { items, discountType, discountValue, amountPaid } = get()
        const subtotal = items.reduce(
          (sum, item) => sum + Number(item.price) * Number(item.quantity),
          0
        )

        let discountAmount = 0
        let discountError = null

        if (discountType === 'fixed') {
          if (discountValue > subtotal && subtotal > 0) {
            discountError = 'Discount cannot be larger than the subtotal.'
          }
          discountAmount = Math.min(subtotal, Math.max(0, Number(discountValue) || 0))
        } else if (discountType === 'percentage') {
          if (discountValue > 100) {
            discountError = 'Percentage discount cannot exceed 100%.'
          }
          const pct = Math.min(100, Math.max(0, Number(discountValue) || 0))
          discountAmount = Number(((subtotal * pct) / 100).toFixed(2))
        }

        const total = Math.max(0, Number((subtotal - discountAmount).toFixed(2)))
        const paidNum = Number(amountPaid || 0)
        const change = paidNum >= total ? Number((paidNum - total).toFixed(2)) : 0

        return {
          subtotal: Number(subtotal.toFixed(2)),
          discountAmount: Number(discountAmount.toFixed(2)),
          total,
          paidNum,
          change,
          discountError,
          itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
        }
      },
    }),
    {
      name: 'marilou_pos_active_cart',
    }
  )
)
