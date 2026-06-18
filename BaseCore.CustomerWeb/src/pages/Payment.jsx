import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../contexts/AuthContext'
import orderApi from '../api/orderApi'
import { formatDate, formatVND } from '../utils/format'

const BANK_CODE = 'MB'
const BANK_NAME = 'MBBank'
const ACCOUNT_NO = '0827027392472'
const ACCOUNT_NAME = 'SHOP VAN PHONG PHAM'

const STATUS_INFO = {
  Pending: {
    label: 'Chờ thanh toán / xác nhận',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    message: 'Vui lòng chuyển khoản đúng số tiền và nội dung. Admin sẽ duyệt đơn sau khi kiểm tra giao dịch.',
  },
  Processing: {
    label: 'Đã xác nhận - đang xử lý',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
    message: 'Thanh toán hoặc đơn hàng đã được xác nhận. Đơn đang được xử lý.',
  },
  Completed: {
    label: 'Thanh toán thành công ',
    className: 'bg-green-100 text-green-800 border-green-200',
    message: 'Đơn hàng đang được giao. Cảm ơn bạn đã mua sắm.',
  },
  Cancelled: {
    label: 'Đã hủy',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    message: 'Đơn hàng này đã bị hủy.',
  },
  Rejected: {
    label: 'Không được duyệt',
    className: 'bg-red-100 text-red-800 border-red-200',
    message: 'Đơn hàng này không được duyệt. Vui lòng kiểm tra lại trong mục đơn hàng.',
  },
}

export default function Payment() {
  const { orderId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [order, setOrder] = useState(state?.order || null)
  const [details, setDetails] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState('')
  const [canceling, setCanceling] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    setLoading(true)
    orderApi.getById(orderId)
      .then((res) => {
        setOrder(res?.order || res)
        setDetails(Array.isArray(res?.details) ? res.details : [])
      })
      .catch(() => {
        if (!state?.order) {
          toast.error('Không tải được thông tin thanh toán')
          navigate('/orders', { replace: true })
        }
      })
      .finally(() => setLoading(false))
  }, [authLoading, user, orderId, navigate, state?.order])

  const amount = Number(order?.totalAmount || 0)
  const paymentContent = useMemo(() => `DON HANG ${orderId}`, [orderId])
  const qrUrl = useMemo(() => {
    const params = new URLSearchParams({
      amount: String(Math.round(amount)),
      addInfo: paymentContent,
      accountName: ACCOUNT_NAME,
    })
    return `https://img.vietqr.io/image/${BANK_CODE}-${ACCOUNT_NO}-compact2.png?${params.toString()}`
  }, [amount, paymentContent])

  const statusInfo = STATUS_INFO[order?.status] || {
    label: order?.status || 'Chưa rõ',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    message: 'Vui lòng theo dõi trạng thái đơn hàng trong mục đơn hàng của tôi.',
  }

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1800)
    } catch {
      toast.error('Không thể copy, vui lòng sao chép thủ công')
    }
  }

  const handleCancel = async () => {
    if (!window.confirm(`Xác nhận hủy đơn hàng #${orderId}?`)) return
    setCanceling(true)
    try {
      const res = await orderApi.cancelOrder(orderId)
      setOrder(res?.order || { ...order, status: 'Cancelled' })
      toast.success('Đã hủy đơn hàng')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Hủy đơn hàng thất bại')
    } finally {
      setCanceling(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500">
        Đang tải thông tin thanh toán...
      </div>
    )
  }

  if (!order) return null

  const isPending = order.status === 'Pending'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <Link to="/orders" className="text-sm text-primary-600 hover:underline">
            &larr; Đơn hàng của tôi
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Thanh toán chuyển khoản</h1>
          <p className="text-sm text-gray-500 mt-1">
            Đơn hàng #{orderId}{order.orderDate ? ` - ${formatDate(order.orderDate)}` : ''}
          </p>
        </div>
        <span className={`inline-flex border px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="grid lg:grid-cols-[360px_1fr] gap-6">
        <section className="bg-white rounded-lg border border-gray-200 p-5 h-fit">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold">
              MB
            </div>
            <div>
              <div className="font-semibold text-gray-800">{BANK_NAME}</div>
              <div className="text-xs text-gray-500">Quét QR để chuyển khoản</div>
            </div>
          </div>

          <div className="border rounded-lg p-3 bg-white">
            <img
              src={qrUrl}
              alt="Mã QR chuyển khoản ngân hàng"
              className="w-full max-w-[280px] mx-auto rounded"
              onError={(e) => { e.currentTarget.src = '/qr-ngan-hang.jpg' }}
            />
          </div>

          <div className="mt-4 bg-primary-50 border border-primary-100 rounded-lg p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-primary-700 font-semibold">Số tiền cần chuyển</div>
            <div className="text-2xl font-bold text-primary-700 mt-1">{formatVND(amount)}</div>
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <div className="text-xs uppercase tracking-wide text-amber-800 font-semibold">Nội dung chuyển khoản</div>
            <div className="font-mono font-bold text-gray-900 bg-white border border-amber-200 rounded px-3 py-2 mt-2 break-all">
              {paymentContent}
            </div>
            <button
              type="button"
              onClick={() => copy(paymentContent, 'content')}
              className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white rounded py-2 text-sm font-medium"
            >
              {copied === 'content' ? 'Đã copy nội dung' : 'Copy nội dung'}
            </button>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 mb-3">Thông tin tài khoản nhận tiền</h2>
            <InfoRow label="Ngân hàng" value={`${BANK_NAME} (${BANK_CODE})`} />
            <InfoRow
              label="Số tài khoản"
              value={ACCOUNT_NO}
              action={(
                <button
                  type="button"
                  onClick={() => copy(ACCOUNT_NO, 'account')}
                  className="text-xs border border-primary-500 text-primary-600 rounded px-2 py-1 hover:bg-primary-50"
                >
                  {copied === 'account' ? 'Đã copy' : 'Copy'}
                </button>
              )}
            />
            <InfoRow label="Chủ tài khoản" value={ACCOUNT_NAME} />
            <InfoRow label="Số tiền" value={formatVND(amount)} strong />
            <InfoRow
              label="Nội dung"
              value={paymentContent}
              strong
              action={(
                <button
                  type="button"
                  onClick={() => copy(paymentContent, 'content2')}
                  className="text-xs border border-primary-500 text-primary-600 rounded px-2 py-1 hover:bg-primary-50"
                >
                  {copied === 'content2' ? 'Đã copy' : 'Copy'}
                </button>
              )}
            />
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 mb-3">Tóm tắt đơn hàng</h2>
            <InfoRow label="Mã đơn hàng" value={`#${orderId}`} />
            <InfoRow label="Phí vận chuyển" value={formatVND(order.shippingFee || 0)} />
            <InfoRow label="Tổng thanh toán" value={formatVND(amount)} strong />
            <InfoRow label="Phương thức" value="Chuyển khoản ngân hàng" />
            <InfoRow label="Địa chỉ giao hàng" value={order.shippingAddress || 'Chưa có'} />

            {details.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="text-sm font-medium text-gray-700 mb-2">Sản phẩm</div>
                <div className="space-y-2">
                  {details.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3 text-sm bg-gray-50 rounded p-2">
                      <div>
                        <div className="font-medium text-gray-800">{item.productName}</div>
                        <div className="text-gray-500">x {item.quantity} | {formatVND(item.unitPrice)}</div>
                      </div>
                      <div className="font-semibold text-primary-700">
                        {formatVND(item.unitPrice * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h2 className="font-bold text-gray-800 mb-2">Lưu ý thanh toán</h2>
            <p className="text-sm text-gray-600 mb-3">{statusInfo.message}</p>
            <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
              <li>Chuyển đúng số tiền: <b>{formatVND(amount)}</b>.</li>
              <li>Nhập đúng nội dung chuyển khoản: <b>{paymentContent}</b>.</li>
              <li>Sau khi chuyển khoản, vui lòng chờ admin kiểm tra và duyệt đơn.</li>
              <li>Đơn chỉ được trừ kho khi admin duyệt thành công.</li>
            </ul>

            <div className="flex flex-wrap gap-3 mt-5">
              <Link to="/orders" className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded text-sm font-medium">
                Xem đơn hàng
              </Link>
              <Link to="/products" className="border border-primary-500 text-primary-600 hover:bg-primary-50 px-4 py-2 rounded text-sm font-medium">
                Tiếp tục mua sắm
              </Link>
              {isPending && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={canceling}
                  className="border border-red-300 text-red-600 hover:border-red-500 hover:text-red-700 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
                >
                  {canceling ? 'Đang hủy...' : 'Hủy đơn hàng'}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoRow({ label, value, strong = false, action = null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-2.5 last:border-b-0 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className={`text-right text-gray-800 ${strong ? 'font-bold text-primary-700' : 'font-medium'}`}>
        {value}
        {action && <span className="ml-2 inline-block align-middle">{action}</span>}
      </span>
    </div>
  )
}
