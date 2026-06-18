import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { loadAdminAssets } from '../../utils/loadAdminAssets'
import './admin.css'

export default function AdminLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAdmin, isWarehouse } = useAuth()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadAdminAssets().then(() => setReady(true))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path ? 'active' : ''

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f4f6f9' }}>
        <div style={{ textAlign: 'center', color: '#6c757d' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div>Đang tải giao diện quản trị...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="wrapper">
      {/* Navbar */}
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <a className="nav-link" data-widget="pushmenu" href="#" role="button">
              <i className="fas fa-bars"></i>
            </a>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <Link to="/admin" className="nav-link">Trang chủ Admin</Link>
          </li>
        </ul>

        <ul className="navbar-nav ml-auto">
          <li className="nav-item mr-2">
            <Link
              to="/"
              className="btn btn-sm btn-outline-info"
              style={{ marginTop: 8 }}
              title="Xem giao diện cửa hàng"
            >
              <i className="fas fa-store mr-1"></i> Xem cửa hàng
            </Link>
          </li>
          <li className="nav-item dropdown">
            <a className="nav-link" data-toggle="dropdown" href="#">
              <i className="far fa-user mr-1"></i>
              <span>{user?.name || user?.username}</span>
              {isAdmin && isAdmin() && (
                <span className="badge badge-danger ml-1" style={{ fontSize: '0.65em' }}>Admin</span>
              )}
            </a>
            <div className="dropdown-menu dropdown-menu-right">
              <span className="dropdown-item dropdown-header">
                <i className="fas fa-envelope mr-1"></i>{user?.email}
              </span>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt mr-2"></i>Đăng xuất
              </button>
            </div>
          </li>
        </ul>
      </nav>

      {/* Sidebar */}
      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <Link to="/admin" className="brand-link">
          <i className="fas fa-store ml-3 mr-2 text-warning"></i>
          <span className="brand-text font-weight-light">
            <b>Base</b>Sales Admin
          </span>
        </Link>

        <div className="sidebar">
          <div className="user-panel mt-3 pb-3 mb-3 d-flex">
            <div className="image">
              <i className="fas fa-user-circle fa-2x text-light"></i>
            </div>
            <div className="info">
              <Link to="#" className="d-block">{user?.name || user?.username}</Link>
              <small className="text-light" style={{ opacity: 0.6 }}>
                {isAdmin && isAdmin() ? 'Quản trị viên' : isWarehouse && isWarehouse() ? 'Quản lý kho' : 'Nhân viên'}
              </small>
            </div>
          </div>

          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
              <li className="nav-header">CHỨC NĂNG CHÍNH</li>
              <li className="nav-item">
                <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>
                  <i className="nav-icon fas fa-tachometer-alt"></i>
                  <p>Bảng tổng quan</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/admin/products" className={`nav-link ${isActive('/admin/products')}`}>
                  <i className="nav-icon fas fa-box"></i>
                  <p>Sản phẩm</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/admin/categories" className={`nav-link ${isActive('/admin/categories')}`}>
                  <i className="nav-icon fas fa-tags"></i>
                  <p>Danh mục</p>
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/admin/manufacturers" className={`nav-link ${isActive('/admin/manufacturers')}`}>
                  <i className="nav-icon fas fa-industry"></i>
                  <p>Nhà sản xuất</p>
                </Link>
              </li>
              {isAdmin && isAdmin() && (
                <>
                  <li className="nav-header">QUẢN TRỊ</li>
                  <li className="nav-item">
                    <Link to="/admin/orders" className={`nav-link ${isActive('/admin/orders')}`}>
                      <i className="nav-icon fas fa-shopping-cart"></i>
                      <p>Đơn hàng</p>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/admin/users" className={`nav-link ${isActive('/admin/users')}`}>
                      <i className="nav-icon fas fa-users"></i>
                      <p>Người dùng</p>
                    </Link>
                  </li>
                </>
              )}
              <li className="nav-item mt-3">
                <Link to="/" className="nav-link">
                  <i className="nav-icon fas fa-store"></i>
                  <p>← Về cửa hàng</p>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Content */}
      {children}

      {/* Footer */}
      <footer className="main-footer">
        <strong>Bản quyền &copy; 2024 <a href="#">BaseCore Sales</a>.</strong>
        <div className="float-right d-none d-sm-inline-block">
          <b>Phiên bản</b> 1.0.0
        </div>
      </footer>
    </div>
  )
}
