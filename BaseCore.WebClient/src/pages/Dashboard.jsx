import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user, loading: authLoading, isAdmin } = useAuth();

    useEffect(() => {
        if (!authLoading) {
            loadStats();
        }
    }, [authLoading]);

    const loadStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await dashboardApi.getStats();
            setStats(res.data);
        } catch (err) {
            console.error('Failed to load stats:', err);
            if (err.response?.status === 401) return;
            if (!err.response) {
                setError('Không thể kết nối tới máy chủ (cổng 5000). Hãy chắc chắn backend đang chạy.');
            } else {
                setError(`Lỗi tải thống kê (${err.response.status}): ${err.response.data?.message || 'Lỗi máy chủ nội bộ'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Bảng tổng quan</h1>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-right">
                                <li className="breadcrumb-item active">Trang chủ</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="sr-only">Đang tải...</span>
                            </div>
                            <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {error}
                            <button className="btn btn-sm btn-outline-danger ml-3" onClick={loadStats}>
                                <i className="fas fa-redo mr-1"></i>Thử lại
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="row">
                                <div className="col-lg-3 col-6">
                                    <div className="small-box bg-info">
                                        <div className="inner">
                                            <h3>{stats?.totalProducts ?? 0}</h3>
                                            <p>Sản phẩm</p>
                                        </div>
                                        <div className="icon">
                                            <i className="fas fa-box"></i>
                                        </div>
                                        <a href="/products" className="small-box-footer">
                                            Xem thêm <i className="fas fa-arrow-circle-right"></i>
                                        </a>
                                    </div>
                                </div>

                                <div className="col-lg-3 col-6">
                                    <div className="small-box bg-success">
                                        <div className="inner">
                                            <h3>{stats?.totalCategories ?? 0}</h3>
                                            <p>Danh mục</p>
                                        </div>
                                        <div className="icon">
                                            <i className="fas fa-tags"></i>
                                        </div>
                                        <a href="/categories" className="small-box-footer">
                                            Xem thêm <i className="fas fa-arrow-circle-right"></i>
                                        </a>
                                    </div>
                                </div>

                                {isAdmin() && (
                                    <>
                                        <div className="col-lg-3 col-6">
                                            <div className="small-box bg-warning">
                                                <div className="inner">
                                                    <h3>{stats?.totalUsers ?? 0}</h3>
                                                    <p>Người dùng</p>
                                                </div>
                                                <div className="icon">
                                                    <i className="fas fa-users"></i>
                                                </div>
                                                <a href="/users" className="small-box-footer">
                                                    Quản lý <i className="fas fa-arrow-circle-right"></i>
                                                </a>
                                            </div>
                                        </div>

                                        <div className="col-lg-3 col-6">
                                            <div className="small-box bg-danger">
                                                <div className="inner">
                                                    <h3>
                                                        {stats?.totalOrders ?? 0}
                                                        {(stats?.pendingOrders ?? 0) > 0 && (
                                                            <span className="badge badge-light ml-2" style={{ fontSize: '0.5em' }}>
                                                                {stats.pendingOrders} chờ
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p>Đơn hàng</p>
                                                </div>
                                                <div className="icon">
                                                    <i className="fas fa-shopping-cart"></i>
                                                </div>
                                                <a href="/orders" className="small-box-footer">
                                                    Quản lý <i className="fas fa-arrow-circle-right"></i>
                                                </a>
                                            </div>
                                        </div>

                                        <div className="col-lg-4 col-md-6 col-12">
                                            <div className="small-box bg-teal">
                                                <div className="inner">
                                                    <h3 style={{ fontSize: '1.6rem' }}>
                                                        {formatCurrency(stats?.totalRevenue ?? 0)}
                                                    </h3>
                                                    <p>Doanh thu (đã hoàn thành)</p>
                                                </div>
                                                <div className="icon">
                                                    <i className="fas fa-chart-line"></i>
                                                </div>
                                                <a href="/orders" className="small-box-footer">
                                                    Xem báo cáo <i className="fas fa-arrow-circle-right"></i>
                                                </a>
                                            </div>
                                        </div>

                                        <div className="col-12">
                                            <div className="card">
                                                <div className="card-header bg-light">
                                                    <h3 className="card-title">
                                                        <i className="fas fa-chart-pie mr-2 text-primary"></i>
                                                        Tổng quan trạng thái đơn hàng
                                                    </h3>
                                                </div>
                                                <div className="card-body">
                                                    <div className="row text-center">
                                                        {[
                                                            { label: 'Chờ duyệt', value: stats?.pendingOrders ?? 0, color: 'warning', icon: 'fa-clock' },
                                                            { label: 'Đang xử lý', value: stats?.processingOrders ?? 0, color: 'info', icon: 'fa-truck' },
                                                            { label: 'Hoàn thành', value: stats?.completedOrders ?? 0, color: 'success', icon: 'fa-check-circle' },
                                                        ].map(item => (
                                                            <div key={item.label} className="col-4">
                                                                <div className={`info-box shadow-sm`}>
                                                                    <span className={`info-box-icon bg-${item.color}`}>
                                                                        <i className={`fas ${item.icon}`}></i>
                                                                    </span>
                                                                    <div className="info-box-content">
                                                                        <span className="info-box-text">{item.label}</span>
                                                                        <span className="info-box-number">{item.value}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="row">
                                <div className="col-12">
                                    <div className="card card-primary card-outline">
                                        <div className="card-header">
                                            <h3 className="card-title">
                                                <i className="fas fa-info-circle mr-2"></i>
                                                Giới thiệu hệ thống
                                            </h3>
                                        </div>
                                        <div className="card-body">
                                            <p className="text-muted">
                                                Chào mừng đến với <strong>BaseCore Sales System</strong> — hệ thống quản lý bán hàng được xây dựng với:
                                            </p>
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <ul className="list-unstyled">
                                                        <li><i className="fas fa-check-circle text-success mr-2"></i><strong>Backend:</strong> .NET Core 8.0 + Entity Framework Core</li>
                                                        <li><i className="fas fa-check-circle text-success mr-2"></i><strong>Frontend:</strong> React 18 + React Router</li>
                                                        <li><i className="fas fa-check-circle text-success mr-2"></i><strong>Giao diện:</strong> AdminLTE 3 + Bootstrap 4</li>
                                                        <li><i className="fas fa-check-circle text-success mr-2"></i><strong>Xác thực:</strong> JWT Bearer Token</li>
                                                    </ul>
                                                </div>
                                                <div className="col-md-6">
                                                    <ul className="list-unstyled">
                                                        <li><i className="fas fa-star text-warning mr-2"></i>Quản lý sản phẩm, danh mục, nhà sản xuất</li>
                                                        <li><i className="fas fa-star text-warning mr-2"></i>Quy trình duyệt đơn hàng</li>
                                                        <li><i className="fas fa-star text-warning mr-2"></i>Thống kê doanh thu với biểu đồ</li>
                                                        <li><i className="fas fa-star text-warning mr-2"></i>Phân quyền Admin / Người dùng</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
