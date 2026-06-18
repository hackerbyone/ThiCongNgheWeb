import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import orderApi from '../api/orderApi'
import { formatVND } from '../utils/format'
import { fetchProvinces, fetchWards } from '../utils/vietnamLocations'
import { toast } from 'react-toastify'

export default function Checkout() {
  const { items, totalAmount, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    province: '',
    ward: '',
    streetAddress: '',
    note: '',
    paymentMethod: 'COD',
  })
  const [submitting, setSubmitting] = useState(false)
  const [provinceList, setProvinceList] = useState([])
  const [wardList, setWardList] = useState([])
  const [loadingWards, setLoadingWards] = useState(false)

  useEffect(() => {
    fetchProvinces().then(setProvinceList)
  }, [])

  useEffect(() => {
    if (!form.province) { setWardList([]); return }
    const prov = provinceList.find((p) => p.name === form.province)
    if (!prov) return
    setLoadingWards(true)
    fetchWards(prov.code).then((names) => {
      setWardList(names)
      setLoadingWards(false)
    })
  }, [form.province, provinceList])

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'province') {
      setForm((f) => ({ ...f, province: value, ward: '' }))
    } else {
      setForm((f) => ({ ...f, [name]: value }))
    }
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-10 text-center">
        <p className="text-gray-500 mb-4">Vui lòng đăng nhập để đặt hàng.</p>
        <Link to="/login" className="text-primary-600 hover:underline">← Đăng nhập</Link>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-10 text-center">
        <p className="text-gray-500 mb-4">Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.</p>
        <Link to="/products" className="text-primary-600 hover:underline">← Quay lại mua sắm</Link>
      </div>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone) {
      toast.error('Vui lòng nhập đầy đủ Họ tên và SĐT')
      return
    }
    if (!form.province || !form.ward || !form.streetAddress.trim()) {
      toast.error('Vui lòng chọn Tỉnh/Thành phố, Xã/Phường/Đặc khu và nhập địa chỉ cụ thể')
      return
    }

    const fullAddress = `${form.streetAddress.trim()}, ${form.ward}, ${form.province}`

    setSubmitting(true)
    try {
      const payload = {
        items: items.map((it) => ({
          productId: it.id,
          quantity: it.quantity,
        })),
        shippingAddress: `${fullAddress} | ${form.name} | ${form.phone}`,
        paymentMethod: form.paymentMethod,
      }

      const res = await orderApi.create(payload)
      const order = res?.order || res
      toast.success('Đặt hàng thành công! Mã đơn: #' + (order?.id || ''))
      clearCart()
      if (form.paymentMethod === 'BankTransfer' && order?.id) {
        navigate(`/payment/${order.id}`, { state: { order } })
      } else {
        navigate('/orders/success', { state: { order } })
      }
    } catch (err) {
      console.error(err)
      toast.error(err?.response?.data?.message || 'Đặt hàng thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  const provinceNames = provinceList.map((p) => p.name)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Thông tin đặt hàng</h1>

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6">
        {/* Thông tin giao hàng */}
        <div className="lg:col-span-2 bg-white rounded-lg p-6">
          <h3 className="font-bold mb-4 text-gray-800">Thông tin người nhận</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Họ và tên *" name="name" value={form.name} onChange={handleChange} />
            <Field label="Số điện thoại *" name="phone" value={form.phone} onChange={handleChange} />
            <div className="sm:col-span-2">
              <Field label="Email" name="email" value={form.email} onChange={handleChange} type="email" />
            </div>
          </div>

          <h3 className="font-bold mt-6 mb-4 text-gray-800">Địa chỉ giao hàng</h3>

          {/* Tỉnh / Thành */}
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tỉnh / Thành phố *</label>
              <SearchableSelect
                options={provinceNames}
                value={form.province}
                onChange={(val) => setForm((f) => ({ ...f, province: val, ward: '' }))}
                placeholder={provinceList.length === 0 ? 'Đang tải...' : '-- Chọn Tỉnh / Thành phố --'}
              />
            </div>

            {/* Xã / Phường / Đặc khu */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">Xã / Phường / Đặc khu *</label>
              <SearchableSelect
                options={wardList}
                value={form.ward}
                onChange={(val) => setForm((f) => ({ ...f, ward: val }))}
                placeholder={loadingWards ? 'Đang tải...' : '-- Chọn Xã / Phường / Đặc khu --'}
                disabled={!form.province || loadingWards}
              />
            </div>
          </div>

          {/* Địa chỉ cụ thể */}
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Số nhà, tên đường *</label>
            <input
              type="text"
              name="streetAddress"
              value={form.streetAddress}
              onChange={handleChange}
              placeholder="Ví dụ: 123 Nguyễn Trãi, tòa A, tầng 3"
              className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          {/* Preview địa chỉ đầy đủ */}
          {form.province && form.ward && form.streetAddress && (
            <div className="bg-primary-50 border border-primary-200 rounded px-3 py-2 text-sm text-primary-800 mb-4">
              <span className="font-medium">Địa chỉ giao hàng:</span>{' '}
              {form.streetAddress}, {form.ward}, {form.province}
            </div>
          )}

          {/* Ghi chú */}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ghi chú cho người giao hàng</label>
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              rows={2}
              className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="Giao giờ hành chính, để tại bảo vệ, gọi trước khi giao..."
            />
          </div>

          <h3 className="font-bold mt-6 mb-3 text-gray-800">Phương thức thanh toán</h3>
          <div className="space-y-2 text-sm">
            <label className="flex items-center gap-2 border rounded p-3 cursor-pointer hover:border-primary-500">
              <input
                type="radio"
                name="payment"
                value="COD"
                checked={form.paymentMethod === 'COD'}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              />
              <span>💵 Thanh toán khi nhận hàng (COD)</span>
            </label>
            <label className="flex items-center gap-2 border rounded p-3 cursor-pointer hover:border-primary-500">
              <input
                type="radio"
                name="payment"
                value="BankTransfer"
                checked={form.paymentMethod === 'BankTransfer'}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              />
              <span>🏦 Chuyển khoản ngân hàng</span>
            </label>
          </div>
        </div>

        {/* Tóm tắt đơn hàng */}
        <aside className="bg-white rounded-lg p-5 h-fit">
          <h3 className="font-bold mb-3 text-gray-800">Đơn hàng của bạn</h3>
          <div className="space-y-2 text-sm border-b pb-3 mb-3 max-h-72 overflow-y-auto">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between gap-2">
                <span className="line-clamp-2 text-gray-700">
                  {it.name} <span className="text-gray-400">× {it.quantity}</span>
                </span>
                <span className="shrink-0">{formatVND(it.price * it.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>Tạm tính</span>
            <span>{formatVND(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mb-3">
            <span>Phí vận chuyển</span>
            <span className={totalAmount >= 300000 ? 'text-green-600 font-medium' : ''}>
              {totalAmount >= 300000 ? 'Miễn phí' : formatVND(30000)}
            </span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-3 mb-4">
            <span>Tổng cộng</span>
            <span className="text-primary-700">
              {formatVND(totalAmount >= 300000 ? totalAmount : totalAmount + 30000)}
            </span>
          </div>
          {totalAmount < 300000 && (
            <p className="text-xs text-gray-400 mb-3 text-center">
              Mua thêm {formatVND(300000 - totalAmount)} để được miễn phí vận chuyển
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-accent-500 hover:bg-accent-600 disabled:bg-gray-400 text-white py-3 rounded font-medium transition-colors"
          >
            {submitting ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
          </button>
        </aside>
      </form>
    </div>
  )
}

function Field({ label, name, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-primary-500"
      />
    </div>
  )
}

function SearchableSelect({ options, value, onChange, placeholder, disabled = false }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (opt) => {
    onChange(opt)
    setQuery('')
    setOpen(false)
  }

  const handleToggle = () => {
    if (!disabled) setOpen((o) => !o)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between border rounded px-3 py-2 text-sm text-left transition-colors
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-white cursor-pointer hover:border-primary-500'}
          ${open ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-300'}`}
      >
        <span className={value ? 'text-gray-800' : 'text-gray-400 text-sm'}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded outline-none focus:border-primary-500"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-gray-400 text-center">Không tìm thấy</li>
            ) : (
              filtered.map((opt) => (
                <li
                  key={opt}
                  onMouseDown={() => handleSelect(opt)}
                  className={`px-3 py-2 text-sm cursor-pointer transition-colors
                    ${value === opt
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'}`}
                >
                  {opt}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
