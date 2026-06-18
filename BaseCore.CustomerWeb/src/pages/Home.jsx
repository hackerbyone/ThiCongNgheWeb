import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import productApi from '../api/productApi'
import categoryApi from '../api/categoryApi'
import ProductCard from '../components/ProductCard'
import Loading from '../components/Loading'

export default function Home() {
  const [products, setProducts] = useState([])
  const [saleProducts, setSaleProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productApi.getList({ pageSize: 12 }),
      categoryApi.getList(),
      productApi.getList({ discountOnly: true, pageSize: 8 }),
    ])
      .then(([prodRes, catRes, saleRes]) => {
        setProducts(prodRes?.items || [])
        setCategories(Array.isArray(catRes) ? catRes : [])
        setSaleProducts(saleRes?.items || [])
      })
      .catch((err) => console.error('Load home failed:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="fade-in">
      {/* Hero banner */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-accent-500 font-medium mb-2">🎉 Khuyến mãi tháng này</p>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              Văn phòng phẩm <br />
              <span className="text-accent-500">chính hãng - giá tốt</span>
            </h1>
            <p className="text-gray-200 mb-6">
              Hơn 1.000+ sản phẩm dụng cụ học tập, văn phòng. Giao hàng toàn quốc trong 24h.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-block bg-accent-500 hover:bg-accent-600 text-white px-6 py-3 rounded-full font-medium"
              >
                Mua sắm ngay →
              </Link>
              <Link
                to="/products?discount=1"
                onClick={() => {}}
                className="inline-block bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-full font-medium border border-white/30"
              >
                🔥 Xem khuyến mãi
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="w-72 h-72 bg-white/10 rounded-full flex items-center justify-center text-9xl backdrop-blur">
              ✏️
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4">

        {/* Danh mục nổi bật */}
        <section className="my-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Danh mục nổi bật</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {categories.slice(0, 16).map((c) => (
              <Link
                key={c.id}
                to={`/category/${c.id}`}
                className="bg-white border border-gray-200 hover:border-primary-500 rounded-lg p-3 text-center hover:shadow transition"
              >
                <div className="w-12 h-12 mx-auto bg-primary-50 rounded-full flex items-center justify-center text-2xl mb-1">
                  📦
                </div>
                <div className="text-xs font-medium text-gray-700 line-clamp-2">{c.name}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Banner lợi ích */}
        <section className="grid md:grid-cols-3 gap-4 mb-8">
          {[
            { icon: '🚚', title: 'Giao hàng miễn phí', desc: 'Cho đơn từ 300.000đ' },
            { icon: '🛡️', title: 'Bảo hành chính hãng', desc: 'Đổi trả trong 7 ngày' },
            { icon: '💳', title: 'Thanh toán linh hoạt', desc: 'COD, chuyển khoản, thẻ' },
          ].map((b, i) => (
            <div key={i} className="bg-white rounded-lg p-4 flex items-center gap-3 border border-gray-200">
              <div className="text-2xl">{b.icon}</div>
              <div>
                <div className="font-semibold text-gray-800 text-sm">{b.title}</div>
                <div className="text-xs text-gray-500">{b.desc}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Sản phẩm đang giảm giá */}
        {saleProducts.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <h2 className="text-xl font-bold text-red-600">Đang giảm giá</h2>
                <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {saleProducts.length} sản phẩm
                </span>
              </div>
              <Link
                to="/products"
                onClick={() => {}}
                className="text-sm text-red-500 hover:underline font-medium"
              >
                Xem tất cả →
              </Link>
            </div>
            {loading ? (
              <Loading />
            ) : (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {saleProducts.slice(0, 10).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sản phẩm nổi bật */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Sản phẩm nổi bật</h2>
            <Link to="/products" className="text-sm text-primary-600 hover:underline">
              Xem tất cả →
            </Link>
          </div>
          {loading ? (
            <Loading />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {products.slice(0, 10).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
