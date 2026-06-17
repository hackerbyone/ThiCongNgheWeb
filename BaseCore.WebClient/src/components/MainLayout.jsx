import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MainLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuth();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path ? 'active' : '';

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
                        <Link to="/" className="nav-link">Trang chủ</Link>
                    </li>
                </ul>

                <ul className="navbar-nav ml-auto">
                    <li className="nav-item dropdown">
                        <a className="nav-link" data-toggle="dropdown" href="#">
                            <i className="far fa-user mr-1"></i>
                            <span>{user?.name || user?.username}</span>
                            {isAdmin() && (
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
                <Link to="/" className="brand-link">
                    <i className="fas fa-store ml-3 mr-2 text-warning"></i>
                    <span className="brand-text font-weight-light">
                        <b>Base</b>Sales
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
                                {isAdmin() ? 'Quản trị viên' : 'Người dùng'}
                            </small>
                        </div>
                    </div>

                    <nav className="mt-2">
                        <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu">
                            <li className="nav-header">CHỨC NĂNG CHÍNH</li>
                            <li className="nav-item">
                                <Link to="/" className={`nav-link ${isActive('/')}`}>
                                    <i className="nav-icon fas fa-tachometer-alt"></i>
                                    <p>Bảng tổng quan</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/products" className={`nav-link ${isActive('/products')}`}>
                                    <i className="nav-icon fas fa-box"></i>
                                    <p>Sản phẩm</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/categories" className={`nav-link ${isActive('/categories')}`}>
                                    <i className="nav-icon fas fa-tags"></i>
                                    <p>Danh mục</p>
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/manufacturers" className={`nav-link ${isActive('/manufacturers')}`}>
                                    <i className="nav-icon fas fa-industry"></i>
                                    <p>Nhà sản xuất</p>
                                </Link>
                            </li>
                            {isAdmin() && (
                                <>
                                    <li className="nav-header">QUẢN TRỊ</li>
                                    <li className="nav-item">
                                        <Link to="/orders" className={`nav-link ${isActive('/orders')}`}>
                                            <i className="nav-icon fas fa-shopping-cart"></i>
                                            <p>Đơn hàng</p>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link to="/users" className={`nav-link ${isActive('/users')}`}>
                                            <i className="nav-icon fas fa-users"></i>
                                            <p>Người dùng</p>
                                        </Link>
                                    </li>
                                </>
                            )}
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
    );
};

export default MainLayout;
