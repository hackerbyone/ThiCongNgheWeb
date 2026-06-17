import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import '../admin/admin.css'

const navItems = [
    { to: '/warehouse',          icon: 'fas fa-tachometer-alt', label: 'Tổng quan' },
    { to: '/warehouse/products', icon: 'fas fa-box-open',       label: 'Sản phẩm' },
    { to: '/warehouse/stock',    icon: 'fas fa-boxes',          label: 'Tồn kho' },
    { to: '/warehouse/categories', icon: 'fas fa-tags',          label: 'Danh mục' },
    { to: '/warehouse/receipts', icon: 'fas fa-truck-loading',  label: 'Nhập kho' },
    { to: '/warehouse/damaged',  icon: 'fas fa-exclamation-triangle', label: 'Hư hỏng' },
    { to: '/warehouse/history',  icon: 'fas fa-history',        label: 'Lịch sử giao dịch' },
    { to: '/warehouse/report',   icon: 'fas fa-chart-bar',      label: 'Báo cáo & Xuất' },
]

export default function WarehouseLayout({ children }) {
    const location = useLocation()
    const navigate = useNavigate()
    const { user, logout, isAdmin } = useAuth()

    const handleLogout = () => { logout(); navigate('/login') }
    const isActive = (path) =>
        path === '/warehouse' ? location.pathname === '/warehouse' : location.pathname.startsWith(path)

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
                        <span className="nav-link font-weight-bold text-warning">
                            <i className="fas fa-warehouse mr-1"></i>Kho hàng
                        </span>
                    </li>
                </ul>
                <ul className="navbar-nav ml-auto">
                    {isAdmin && isAdmin() && (
                        <li className="nav-item mr-2">
                            <Link to="/admin" className="btn btn-sm btn-outline-secondary" style={{ marginTop: 8 }}>
                                <i className="fas fa-user-shield mr-1"></i>Admin Portal
                            </Link>
                        </li>
                    )}
                    <li className="nav-item mr-2">
                        <Link to="/" className="btn btn-sm btn-outline-info" style={{ marginTop: 8 }}>
                            <i className="fas fa-store mr-1"></i>Cửa hàng
                        </Link>
                    </li>
                    <li className="nav-item dropdown">
                        <a className="nav-link" data-toggle="dropdown" href="#">
                            <i className="far fa-user mr-1"></i>
                            <span>{user?.name || user?.username}</span>
                            <span className="badge badge-warning ml-1" style={{ fontSize: '0.65em' }}>Kho</span>
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
                <Link to="/warehouse" className="brand-link">
                    <i className="fas fa-warehouse ml-3 mr-2 text-warning"></i>
                    <span className="brand-text font-weight-light">
                        <b>Quản lý</b> Kho hàng
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
                                {isAdmin && isAdmin() ? 'Quản trị viên' : 'Nhân viên kho'}
                            </small>
                        </div>
                    </div>
                    <nav className="mt-2">
                        <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
                            <li className="nav-header">QUẢN LÝ KHO HÀNG</li>
                            {navItems.map(item => (
                                <li key={item.to} className="nav-item">
                                    <Link to={item.to} className={`nav-link ${isActive(item.to) ? 'active' : ''}`}>
                                        <i className={`nav-icon ${item.icon}`}></i>
                                        <p>{item.label}</p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </aside>

            {/* Content */}
            {children}

            {/* Footer */}
            <footer className="main-footer">
                <strong>Hệ thống quản lý kho &copy; 2024 <a href="#">BaseCore Sales</a>.</strong>
            </footer>
        </div>
    )
}
