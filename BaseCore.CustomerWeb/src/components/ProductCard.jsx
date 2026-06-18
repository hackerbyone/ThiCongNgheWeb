import { memo } from 'react'
import { Link } from 'react-router-dom'
import { formatVND, resolveImageUrl } from '../utils/format'
import { useCart } from '../contexts/CartContext'

const ProductCard = memo(function ProductCard({ product }) {
  const { addItem } = useCart()

  const disc = product.discountPercent ?? 0
  const effectivePrice = disc > 0 ? product.price * (1 - disc / 100) : product.price
  const savedAmount = product.price - effectivePrice
  const averageRating = Number(product.averageRating || 0)
  const reviewCount = Number(product.reviewCount || 0)

  const handleAddCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({ ...product, price: effectivePrice }, 1)
  }

  return (
    <Link
      to={`/product/${product.id}`}
      className="group bg-white rounded-lg overflow-hidden border border-gray-200 hover:border-primary-500 hover:shadow-lg transition-all flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={resolveImageUrl(product.imageUrl)}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = '/placeholder.svg' }}
        />
        {disc > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            -{disc}%
          </span>
        )}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full">
              Hết hàng
            </span>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-1 min-h-[2.5rem]">
          {product.name}
        </h3>
        {product.manufacturer?.name && (
          <p className="text-xs text-gray-400 mb-1 truncate">{product.manufacturer.name}</p>
        )}
        {reviewCount > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
            <span className="text-yellow-400">★</span>
            <span className="font-medium text-gray-700">{averageRating.toFixed(1)}</span>
            <span>({reviewCount})</span>
          </div>
        )}

        <div className="mt-auto">
          {disc > 0 ? (
            <div className="mb-2">
              <div className="text-red-600 font-bold text-base leading-tight">{formatVND(effectivePrice)}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-gray-400 line-through text-xs">{formatVND(product.price)}</span>
                <span className="text-green-600 text-xs font-medium">Tiết kiệm {formatVND(savedAmount)}</span>
              </div>
            </div>
          ) : (
            <div className="text-primary-600 font-bold text-base mb-2">{formatVND(product.price)}</div>
          )}
          <button
            onClick={handleAddCart}
            disabled={product.stock === 0}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs py-2 rounded font-medium transition-colors"
          >
            {product.stock === 0 ? 'Hết hàng' : '+ Thêm vào giỏ'}
          </button>
        </div>
      </div>
    </Link>
  )
})

export default ProductCard
