import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import productApi from '../api/productApi'
import categoryApi from '../api/categoryApi'
import ProductCard from '../components/ProductCard'
import Loading from '../components/Loading'

const PRICE_MAX = 500000
const PRICE_STEP = 5000

export default function ProductList() {
  const { id: categoryId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const keyword = searchParams.get('q') || ''
  const discountOnly = searchParams.get('discount') === '1'

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [currentCategory, setCurrentCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 16

  const [inputKeyword, setInputKeyword] = useState(keyword)
  const [inputMinPrice, setInputMinPrice] = useState(0)
  const [inputMaxPrice, setInputMaxPrice] = useState(PRICE_MAX)
  const [inputBrand, setInputBrand] = useState('')

  const [minPrice, setMinPrice] = useState(null)
  const [maxPrice, setMaxPrice] = useState(null)
  const [brand, setBrand] = useState('')

  // --- custom drag state ---
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(null) // 'min' | 'max' | null

  useEffect(() => { setInputKeyword(keyword) }, [keyword])

  useEffect(() => {
    categoryApi.getList()
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (categoryId) {
      categoryApi.getById(categoryId)
        .then((res) => setCurrentCategory(res))
        .catch(() => setCurrentCategory(null))
    } else {
      setCurrentCategory(null)
    }
  }, [categoryId])

  useEffect(() => { setPage(1) }, [categoryId, keyword, discountOnly])

  useEffect(() => {
    setLoading(true)
    productApi.search({
      keyword,
      categoryId,
      minPrice: minPrice != null ? minPrice : undefined,
      maxPrice: maxPrice != null ? maxPrice : undefined,
      brand: brand !== '' ? brand : undefined,
      discountOnly,
      page,
      pageSize,
    })
      .then((res) => {
        setProducts(res?.items || [])
        setTotalPages(res?.totalPages || 1)
        setTotalCount(res?.totalCount || 0)
      })
      .catch(() => { setProducts([]); setTotalPages(1); setTotalCount(0) })
      .finally(() => setLoading(false))
  }, [page, categoryId, keyword, minPrice, maxPrice, brand, discountOnly])

  // Tính giá trị từ vị trí con trỏ trên track
  const getValFromPointer = (clientX) => {
    if (!trackRef.current) return 0
    const rect = trackRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round((pct * PRICE_MAX) / PRICE_STEP) * PRICE_STEP
  }

  const handleTrackPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    const val = getValFromPointer(e.clientX)
    const dMin = Math.abs(val - inputMinPrice)
    const dMax = Math.abs(val - inputMaxPrice)
    const which = dMin <= dMax ? 'min' : 'max'
    setDragging(which)
    if (which === 'min') setInputMinPrice(Math.min(val, inputMaxPrice - PRICE_STEP))
    else setInputMaxPrice(Math.max(val, inputMinPrice + PRICE_STEP))
  }

  const handleTrackPointerMove = (e) => {
    if (!dragging) return
    const val = getValFromPointer(e.clientX)
    if (dragging === 'min')
      setInputMinPrice(Math.max(0, Math.min(val, inputMaxPrice - PRICE_STEP)))
    else
      setInputMaxPrice(Math.min(PRICE_MAX, Math.max(val, inputMinPrice + PRICE_STEP)))
  }

  const handleTrackPointerUp = () => setDragging(null)

  const minPercent = (inputMinPrice / PRICE_MAX) * 100
  const maxPercent = (inputMaxPrice / PRICE_MAX) * 100

  const handleApplyFilter = () => {
    setPage(1)
    setMinPrice(inputMinPrice > 0 ? inputMinPrice : null)
    setMaxPrice(inputMaxPrice < PRICE_MAX ? inputMaxPrice : null)
    setBrand(inputBrand)
  }

  const handleKeywordSearch = (e) => {
    e.preventDefault()
    const q = inputKeyword.trim()
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/products')
  }

  const handleClearFilter = () => {
    setInputMinPrice(0)
    setInputMaxPrice(PRICE_MAX)
    setInputBrand('')
    setPage(1)
    setMinPrice(null)
    setMaxPrice(null)
    setBrand('')
  }

  const hasActiveFilter = minPrice != null || maxPrice != null || brand

  const title = keyword
    ? `Kết quả tìm: "${keyword}"`
    : discountOnly
    ? 'Sản phẩm khuyến mãi 🔥'
    : currentCategory?.name || 'Tất cả sản phẩm'

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 fade-in">
      <div className="flex flex-col md:flex-row gap-6">

        {/* Sidebar */}
        <aside className="w-full md:w-56 shrink-0 space-y-4">

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
                    !categoryId && !discountOnly ? 'text-primary-700 font-medium bg-primary-50' : 'text-gray-700'
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

          {/* Bộ lọc */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <h3 className="bg-primary-700 text-white px-4 py-2.5 font-medium text-sm">
              Bộ lọc tìm kiếm
            </h3>
            <div className="p-4 space-y-4">

              {/* 1. Từ khóa */}
              <form onSubmit={handleKeywordSearch}>
                <p className="text-xs font-medium text-gray-600 mb-1.5">1. Từ khóa</p>
                <div className="flex gap-1">
                  <input
                    type="text"
                    placeholder="Tên sản phẩm..."
                    value={inputKeyword}
                    onChange={(e) => setInputKeyword(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <button
                    type="submit"
                    className="shrink-0 bg-primary-500 hover:bg-primary-600 text-white px-2.5 py-1.5 rounded text-xs"
                  >
                    🔍
                  </button>
                </div>
              </form>

              {/* 2. Khoảng giá — custom drag slider */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">2. Khoảng giá (₫)</p>

                {/* Hiển thị giá trị đang chọn */}
                <div className="flex justify-between text-xs font-semibold text-primary-700 mb-3">
                  <span>{inputMinPrice.toLocaleString('vi-VN')}₫</span>
                  <span>
                    {inputMaxPrice < PRICE_MAX
                      ? inputMaxPrice.toLocaleString('vi-VN') + '₫'
                      : '≥ 500k₫'}
                  </span>
                </div>

                {/* Track — toàn bộ drag xử lý ở đây */}
                <div
                  ref={trackRef}
                  className="relative h-6 flex items-center cursor-pointer select-none"
                  onPointerDown={handleTrackPointerDown}
                  onPointerMove={handleTrackPointerMove}
                  onPointerUp={handleTrackPointerUp}
                  onPointerLeave={handleTrackPointerUp}
                >
                  {/* Track nền */}
                  <div className="absolute w-full h-1.5 bg-gray-200 rounded-full" />

                  {/* Vùng đang chọn */}
                  <div
                    className="absolute h-1.5 bg-primary-500 rounded-full pointer-events-none"
                    style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }}
                  />

                  {/* Handle min */}
                  <div
                    className={`absolute w-4 h-4 rounded-full border-2 shadow-md pointer-events-none transition-transform ${
                      dragging === 'min'
                        ? 'bg-primary-500 border-primary-700 scale-125'
                        : 'bg-white border-primary-500'
                    }`}
                    style={{ left: `calc(${minPercent}% - 8px)` }}
                  />

                  {/* Handle max */}
                  <div
                    className={`absolute w-4 h-4 rounded-full border-2 shadow-md pointer-events-none transition-transform ${
                      dragging === 'max'
                        ? 'bg-primary-600 border-primary-800 scale-125'
                        : 'bg-white border-primary-600'
                    }`}
                    style={{ left: `calc(${maxPercent}% - 8px)` }}
                  />
                </div>

                {/* Nhập tay */}
                <div className="flex gap-2 mt-3">
                  <input
                    type="number"
                    placeholder="Từ"
                    value={inputMinPrice === 0 ? '' : inputMinPrice}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 0
                      if (v < inputMaxPrice) setInputMinPrice(v)
                    }}
                    min={0}
                    max={PRICE_MAX}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                  />
                  <input
                    type="number"
                    placeholder="Đến"
                    value={inputMaxPrice >= PRICE_MAX ? '' : inputMaxPrice}
                    onChange={(e) => {
                      const v = Number(e.target.value) || PRICE_MAX
                      if (v > inputMinPrice) setInputMaxPrice(Math.min(v, PRICE_MAX))
                    }}
                    min={0}
                    max={PRICE_MAX}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              {/* 3. Thương hiệu */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">3. Thương hiệu</p>
                <input
                  type="text"
                  placeholder="VD: Thiên Long"
                  value={inputBrand}
                  onChange={(e) => setInputBrand(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Nút áp dụng */}
              <button
                onClick={handleApplyFilter}
                className="w-full bg-primary-500 hover:bg-primary-600 text-white text-sm py-2 rounded font-medium transition-colors"
              >
                Áp dụng bộ lọc
              </button>

              {/* Trạng thái lọc đang dùng + nút xoá */}
              {hasActiveFilter && (
                <>
                  <button
                    onClick={handleClearFilter}
                    className="w-full text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Xoá bộ lọc
                  </button>
                  <div className="text-xs text-gray-500 border-t pt-3 space-y-1">
                    <p className="font-medium text-gray-600 mb-1">Đang lọc:</p>
                    {minPrice != null && (
                      <p>• Giá từ: {minPrice.toLocaleString('vi-VN')}₫</p>
                    )}
                    {maxPrice != null && (
                      <p>• Giá đến: {maxPrice.toLocaleString('vi-VN')}₫</p>
                    )}
                    {brand && <p>• Thương hiệu: {brand}</p>}
                  </div>
                </>
              )}

            </div>
          </div>

        </aside>

        {/* Main content */}
        <main className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{title}</h1>
          <p className="text-sm text-gray-500 mb-4">{totalCount} sản phẩm</p>

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
