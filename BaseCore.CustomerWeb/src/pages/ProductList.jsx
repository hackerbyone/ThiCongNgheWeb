import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import productApi from '../api/productApi'
import categoryApi from '../api/categoryApi'
import ProductCard from '../components/ProductCard'
import Loading from '../components/Loading'

const MAX_PRICE = 10000000
const STEP = 100000
const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ'

export default function ProductList() {
  const { id: categoryId } = useParams()
  const [searchParams] = useSearchParams()
  const keyword = searchParams.get('q') || ''

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [currentCategory, setCurrentCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 12

  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(MAX_PRICE)
  const [appliedMin, setAppliedMin] = useState(null)
  const [appliedMax, setAppliedMax] = useState(null)
  const [sortOrder, setSortOrder] = useState('')
  const [discountOnly, setDiscountOnly] = useState(false)

  useEffect(() => {
    categoryApi.getList()
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPage(1)
  }, [categoryId, keyword])

  useEffect(() => {
    if (categoryId) {
      categoryApi.getById(categoryId)
        .then((res) => setCurrentCategory(res))
        .catch(() => setCurrentCategory(null))
    } else {
      setCurrentCategory(null)
    }
  }, [categoryId])

  useEffect(() => {
    setLoading(true)
    const params = { page, pageSize }
    if (categoryId) params.categoryId = categoryId
    if (keyword) params.keyword = keyword
    if (appliedMin !== null) params.minPrice = appliedMin
    if (appliedMax !== null) params.maxPrice = appliedMax
    if (sortOrder) params.sortBy = sortOrder
    if (discountOnly) params.discountOnly = true

    productApi.getList(params)
      .then((res) => {
        setProducts(res?.items || [])
        setTotalPages(res?.totalPages || 1)
        setTotalCount(res?.totalCount || 0)
      })
      .catch(() => {
        setProducts([])
        setTotalPages(1)
        setTotalCount(0)
      })
      .finally(() => setLoading(false))
  }, [page, categoryId, keyword, appliedMin, appliedMax, sortOrder, discountOnly])

  const handleSliderMin = (e) => {
    setPriceMin(Math.min(+e.target.value, priceMax - STEP))
  }

  const handleSliderMax = (e) => {
    setPriceMax(Math.max(+e.target.value, priceMin + STEP))
  }

  const applyPrice = () => {
    setAppliedMin(priceMin > 0 ? priceMin : null)
    setAppliedMax(priceMax < MAX_PRICE ? priceMax : null)
    setPage(1)
  }

  const resetPrice = () => {
    setPriceMin(0)
    setPriceMax(MAX_PRICE)
    setAppliedMin(null)
    setAppliedMax(null)
    setPage(1)
  }

  const minPercent = (priceMin / MAX_PRICE) * 100
  const maxPercent = (priceMax / MAX_PRICE) * 100
  const isPriceFiltered = appliedMin !== null || appliedMax !== null

  const title = keyword
    ? `Kết quả tìm: "${keyword}"`
    : currentCategory?.name || 'Tất cả sản phẩm'

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 fade-in">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0 space-y-4">

          {/* Hàng giảm giá */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => { setDiscountOnly(!discountOnly); setPage(1) }}
              className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                discountOnly
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <span className="text-base">🔥</span>
              <span>Hàng đang giảm giá</span>
              {discountOnly && <span className="ml-auto text-white text-xs">✓</span>}
            </button>
          </div>

          {/* Danh mục */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <h3 className="bg-primary-700 text-white px-4 py-2.5 font-medium text-sm">
              Danh mục
            </h3>
            <ul>
              <li>
                <Link
                  to="/products"
                  className={`block px-4 py-2 text-sm hover:bg-primary-50 border-b border-gray-100 ${
                    !categoryId ? 'text-primary-700 font-medium bg-primary-50' : 'text-gray-700'
                  }`}
                >
                  Tất cả sản phẩm
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/category/${c.id}`}
                    className={`block px-4 py-2 text-sm hover:bg-primary-50 border-b border-gray-100 ${
                      Number(categoryId) === c.id ? 'text-primary-700 font-medium bg-primary-50' : 'text-gray-700'
                    }`}
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Lọc theo giá */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-primary-700 text-white px-4 py-2.5">
              <h3 className="font-medium text-sm">Lọc theo giá</h3>
              {isPriceFiltered && (
                <button
                  onClick={resetPrice}
                  className="text-xs underline opacity-80 hover:opacity-100"
                >
                  Xóa
                </button>
              )}
            </div>
            <div className="px-4 py-4">
              {/* Dual range slider — kéo thả để lọc */}
              <div className="range-slider">
                <div className="range-slider-track">
                  <div
                    className="range-slider-fill"
                    style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE}
                  step={STEP}
                  value={priceMin}
                  onChange={handleSliderMin}
                  onMouseUp={applyPrice}
                  onTouchEnd={applyPrice}
                  className="range-input"
                  style={{ zIndex: minPercent >= maxPercent - 5 ? 5 : 3 }}
                />
                <input
                  type="range"
                  min={0}
                  max={MAX_PRICE}
                  step={STEP}
                  value={priceMax}
                  onChange={handleSliderMax}
                  onMouseUp={applyPrice}
                  onTouchEnd={applyPrice}
                  className="range-input"
                  style={{ zIndex: 4 }}
                />
              </div>
              <div className="flex justify-between text-xs text-primary-700 font-medium mt-2">
                <span>{fmt(priceMin)}</span>
                <span>{fmt(priceMax)}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-0.5">
                {discountOnly ? '🔥 Hàng đang giảm giá' : title}
              </h1>
              <p className="text-sm text-gray-500">
                {totalCount} sản phẩm
                {isPriceFiltered && (
                  <span className="ml-1 text-primary-600">
                    · {fmt(appliedMin ?? 0)} – {fmt(appliedMax ?? MAX_PRICE)}
                  </span>
                )}
              </p>
            </div>

            {/* Sắp xếp */}
            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setPage(1) }}
              className="border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-700 outline-none focus:border-primary-500 bg-white cursor-pointer"
            >
              <option value="">Sắp xếp: Mặc định</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
            </select>
          </div>

          {loading ? (
            <Loading />
          ) : products.length === 0 ? (
            <div className="bg-white rounded-lg p-10 text-center text-gray-500">
              Không tìm thấy sản phẩm phù hợp.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex justify-center items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    ← Trước
                  </button>
                  <span className="px-3 py-1.5 text-sm text-gray-600">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded border text-sm disabled:opacity-40 hover:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    Sau →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
