import { Link } from 'react-router-dom'

export default function Contact() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10 fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Liên hệ với chúng tôi</h1>
      <p className="text-gray-500 text-sm mb-8">
        Bạn cần tư vấn sản phẩm, hỗ trợ đơn hàng hoặc có câu hỏi? Hãy liên hệ ngay với nhân viên của chúng tôi.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {/* Zalo */}
        <a
          href="https://zalo.me/0827027392"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-blue-100 flex items-center justify-center bg-blue-50">
            <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
              <rect width="48" height="48" rx="12" fill="#0068FF"/>
              <text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle"
                fill="white" fontSize="16" fontWeight="bold" fontFamily="Arial">Zalo</text>
            </svg>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Nhắn tin Zalo</div>
            <div className="font-bold text-lg text-gray-800 group-hover:text-blue-600 transition-colors">
              0827 027 392
            </div>
            <div className="text-sm text-blue-500 mt-1">Nhấn để mở Zalo →</div>
          </div>
        </a>

        {/* Facebook */}
        <a
          href="https://web.facebook.com/minhtri.trinh.750/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-5 bg-white border border-gray-200 rounded-xl p-6 hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="w-16 h-16 rounded-full overflow-hidden shrink-0 border-2 border-indigo-100 flex items-center justify-center bg-indigo-50">
            <svg viewBox="0 0 48 48" className="w-10 h-10">
              <rect width="48" height="48" rx="12" fill="#1877F2"/>
              <path
                d="M31 24h-4v12h-5V24h-3v-4h3v-2.5C22 14.8 23.8 13 26.5 13c1.2 0 2.5.1 2.5.1V17h-1.8c-1.4 0-1.7.7-1.7 1.6V20h4l-.5 4z"
                fill="white"
              />
            </svg>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Nhắn tin Facebook</div>
            <div className="font-bold text-base text-gray-800 group-hover:text-indigo-600 transition-colors">
              Minh Trí Trịnh
            </div>
            <div className="text-sm text-indigo-500 mt-1">Nhấn để mở Facebook →</div>
          </div>
        </a>
      </div>

      {/* Thông tin bổ sung */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="font-bold text-gray-800 mb-4">Thông tin liên hệ</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="text-xl">📞</span>
            <div>
              <div className="font-medium text-gray-800">Hotline</div>
              <div>0827 027 392</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">🕐</span>
            <div>
              <div className="font-medium text-gray-800">Giờ làm việc</div>
              <div>8:00 – 22:00 mỗi ngày</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">📍</span>
            <div>
              <div className="font-medium text-gray-800">Địa chỉ</div>
              <div>Thới Bình, Cà Mau</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl">📧</span>
            <div>
              <div className="font-medium text-gray-800">Email</div>
              <div>trinhminhtri704@gmail.com</div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link to="/products" className="inline-block bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors">
          ← Quay lại mua sắm
        </Link>
      </div>
    </div>
  )
}
