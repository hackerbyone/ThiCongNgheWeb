import { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-toastify'

const CartContext = createContext(null)
const STORAGE_KEY = 'vpp_cart'

const getStockLimit = (product) => {
  const stock = Number(product?.stock)
  return Number.isFinite(stock) ? Math.max(0, stock) : Infinity
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  // Tải giỏ hàng từ localStorage khi mở app
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try { setItems(JSON.parse(stored)) } catch {}
    }
  }, [])

  // Lưu giỏ hàng mỗi khi thay đổi
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = (product, quantity = 1) => {
    const stockLimit = getStockLimit(product)
    const requestedQuantity = Math.max(1, Number(quantity) || 1)
    let added = false
    let stockBlocked = false

    setItems((prev) => {
      if (stockLimit <= 0) {
        stockBlocked = true
        return prev
      }

      const existing = prev.find((it) => it.id === product.id)
      if (existing) {
        const nextQuantity = Math.min(stockLimit, existing.quantity + requestedQuantity)
        if (nextQuantity === existing.quantity) stockBlocked = true
        else added = true
        return prev.map((it) =>
          it.id === product.id
            ? { ...it, quantity: nextQuantity, stock: Number.isFinite(stockLimit) ? stockLimit : it.stock }
            : it
        )
      }

      const nextQuantity = Math.min(stockLimit, requestedQuantity)
      added = nextQuantity > 0
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          stock: Number.isFinite(stockLimit) ? stockLimit : product.stock,
          quantity: nextQuantity,
        },
      ]
    })

    if (stockBlocked) {
      toast.warning(`Số lượng "${product.name}" đã đạt tồn kho hiện có`)
    } else if (added) {
      toast.success(`Đã thêm "${product.name}" vào giỏ hàng`)
    }
  }

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) return removeItem(id)
    setItems((prev) => prev.map((it) => {
      if (it.id !== id) return it
      const stockLimit = getStockLimit(it)
      const nextQuantity = Math.max(1, Number(quantity) || 1)
      return {
        ...it,
        quantity: Number.isFinite(stockLimit) ? Math.min(nextQuantity, stockLimit) : nextQuantity,
      }
    }))
  }

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const clearCart = () => setItems([])

  const totalQuantity = items.reduce((sum, it) => sum + it.quantity, 0)
  const totalAmount = items.reduce((sum, it) => sum + it.price * it.quantity, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQuantity, removeItem, clearCart, totalQuantity, totalAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
