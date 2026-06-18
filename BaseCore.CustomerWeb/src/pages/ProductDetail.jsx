import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import productApi from '../api/productApi'
import { formatVND, resolveImageUrl } from '../utils/format'
import { useCart } from '../contexts/CartContext'
import Loading from '../components/Loading'
import ProductCard from '../components/ProductCard'

export default function ProductDetail() {
  const { id } = useParams()
  const { addItem } = useCart()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [reviews, setReviews] = useState({ averageRating: 0, reviewCount: 0, items: [] })
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setQuantity(1)
    productApi.getById(id)
      .then((res) => {
        const p = res
        setProduct(p)
        if (p?.categoryId) {
          productApi.getList({ categoryId: p.categoryId, pageSize: 12 })
            .then((r) => {
              const list = r?.items || []
              setRelated(list.filter((x) => x.id !== p.id).slice(0, 5))
            })
            .catch(() => {})
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))

    productApi.getReviews(id)
      .then((res) => setReviews(res || { averageRating: 0, reviewCount: 0, items: [] }))
      .catch(() => setReviews({ averageRating: 0, reviewCount: 0, items: [] }))
  }, [id])

  if (loading) return <Loading />
  if (!product) {
    return (
      <div className="max-w-7xl mx-auto p-10 text-center text-gray-500">
        Không tìm thấy sản phẩm.{' '}
        <Link to="/products" className="text-primary-600 hover:underline">Quay lại</Link>
      </div>
    )
  }

  const disc = product.discountPercent ?? 0
  const effectivePrice = disc > 0 ? product.price * (1 - disc / 100) : product.price
  const averageRating = Number(product.averageRating || reviews.averageRating || 0)
  const reviewCount = Number(product.reviewCount || reviews.reviewCount || 0)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 fade-in">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-primary-600">Trang chủ</Link>
        <span className="mx-2">/</span>
        <Link to="/products" className="hover:text-primary-600">Sản phẩm</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      {/* Chi tiết */}
      <div className="bg-white rounded-lg p-6 grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden">
            <img
              src={resolveImageUrl(product.imageUrl)}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/600?text=No+Image' }}
            />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">{product.name}</h1>
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="text-yellow-400 text-lg">{renderStars(averageRating)}</span>
            {reviewCount > 0 ? (
              <span className="text-gray-600">{averageRating.toFixed(1)} / 5 ({reviewCount} đánh giá)</span>
            ) : (
              <span className="text-gray-400">Chưa có đánh giá</span>
            )}
          </div>
          <div className="mb-4">
            <div className="text-3xl font-bold text-primary-600">{formatVND(effectivePrice)}</div>
            {disc > 0 && (
              <div className="text-gray-400 line-through text-base">{formatVND(product.price)} <span className="text-red-500 no-underline">(-{disc}%)</span></div>
            )}
          </div>

          <div className="border-t border-b py-4 mb-4 space-y-2 text-sm">
            <div><span className="text-gray-500">Mã sản phẩm:</span> <b>#{product.id}</b></div>
            {product.manufacturer && (
              <div>
                <span className="text-gray-500">Nhà sản xuất:</span>{' '}
                <b className="text-gray-800">{product.manufacturer.name}</b>
              </div>
            )}
            <div>
              <span className="text-gray-500">Tình trạng:</span>{' '}
              <b className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                {product.stock > 0 ? `Còn hàng (${product.stock})` : 'Hết hàng'}
              </b>
            </div>
          </div>

          <p className="text-gray-700 mb-6 leading-relaxed">{product.description}</p>

          {/* Số lượng + Mua */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-gray-600">Số lượng:</span>
            <div className="flex items-center border rounded">
              <button
                className="px-3 py-1 hover:bg-gray-100"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >−</button>
              <input
                type="number"
                value={quantity}
                max={product.stock}
                onChange={(e) => setQuantity(Math.min(product.stock, Math.max(1, +e.target.value || 1)))}
                className="w-14 text-center outline-none py-1"
              />
              <button
                className="px-3 py-1 hover:bg-gray-100"
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              >+</button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => addItem({ ...product, price: effectivePrice }, quantity)}
              disabled={product.stock <= 0}
              className="flex-1 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-400 text-white px-6 py-3 rounded font-medium"
            >
              🛒 Thêm vào giỏ
            </button>
            {product.stock > 0 ? (
              <Link
                to="/cart"
                onClick={() => addItem({ ...product, price: effectivePrice }, quantity)}
                className="flex-1 bg-accent-500 hover:bg-accent-600 text-white px-6 py-3 rounded font-medium text-center"
              >
                Mua ngay
              </Link>
            ) : (
              <button
                type="button"
                disabled
                className="flex-1 bg-gray-400 text-white px-6 py-3 rounded font-medium text-center"
              >
                Mua ngay
              </button>
            )}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Đánh giá sản phẩm</h2>
          <div className="text-sm text-gray-500">
            {reviewCount > 0 ? `${averageRating.toFixed(1)} / 5 từ ${reviewCount} đánh giá` : 'Chưa có đánh giá'}
          </div>
        </div>
        {reviews.items?.length > 0 ? (
          <div className="space-y-3">
            {reviews.items.map((review) => (
              <div key={review.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-yellow-400">{renderStars(review.rating)}</span>
                  <span className="text-xs text-gray-400">{formatReviewDate(review.createdAt)}</span>
                </div>
                {review.comment ? (
                  <p className="text-sm text-gray-700 whitespace-pre-line">{review.comment}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Khách hàng chưa để lại bình luận.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Sản phẩm này chưa có bình luận. Khách hàng có thể đánh giá sau khi nhận hàng.</p>
        )}
      </section>

      {/* Sản phẩm liên quan */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Sản phẩm liên quan</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}

function renderStars(value) {
  const rating = Math.round(Number(value || 0))
  return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating))
}

function formatReviewDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('vi-VN')
}
