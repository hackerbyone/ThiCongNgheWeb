import React, { useState, useEffect } from 'react';
import { orderApi, warehouseApi } from '../../services/api';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const statusConfig = {
    Pending:    { label: 'Chờ duyệt',   badge: 'warning',   color: '#ffc107' },
    Processing: { label: 'Đang vận chuyển',  badge: 'info',      color: '#17a2b8' },
    Completed:  { label: 'Hoàn thành',  badge: 'success',   color: '#28a745' },
    Cancelled:  { label: 'Đã hủy',      badge: 'secondary', color: '#6c757d' },
    Rejected:   { label: 'Từ chối',     badge: 'danger',    color: '#dc3545' },
};

const getDefaultDateRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29);
    return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
    };
};

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const downloadBlob = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const exportOrderReportDoc = ({ revenueSummary, warehouseReport, startDate, endDate, periodOrders, periodRevenue }) => {
    const statusSummary = revenueSummary?.statusSummary || {};
    const whSummary = warehouseReport?.summary || {};
    const details = warehouseReport?.details || [];
    const period = `${startDate || 'Tất cả'} đến ${endDate || 'Tất cả'}`;
    const exportDate = new Date().toLocaleString('vi-VN');
    const statusRows = ['Pending', 'Processing', 'Completed', 'Cancelled', 'Rejected'].map(key => {
        const cfg = statusConfig[key];
        const value = statusSummary[key.charAt(0).toLowerCase() + key.slice(1)] ?? 0;
        const percent = periodOrders > 0 ? ((value / periodOrders) * 100).toFixed(1) : '0.0';
        return `
            <tr>
                <td><span class="status-dot" style="background:${cfg.color}"></span>${escapeHtml(cfg.label)}</td>
                <td class="center">${fmt(value)}</td>
                <td class="right">${percent}%</td>
            </tr>
        `;
    }).join('');

    const detailRows = details.length
        ? details.map((d, index) => `
            <tr>
                <td class="center">${index + 1}</td>
                <td class="product">${escapeHtml(d.productName)}</td>
                <td>${escapeHtml(d.categoryName)}</td>
                <td class="center">${fmt(d.currentStock)}</td>
                <td class="center">${fmt(d.quantitySold)}</td>
                <td class="money">${fmtCur(d.revenue)}</td>
                <td class="center">${fmt(d.quantityReceived)}</td>
                <td class="center danger">${fmt(d.quantityDamaged)}</td>
            </tr>
        `).join('')
        : '<tr><td colspan="8" class="empty">Không có dữ liệu sản phẩm trong khoảng thời gian này</td></tr>';

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Báo cáo doanh thu đơn hàng</title>
    <style>
        @page { size: A4 landscape; margin: 1.2cm; }
        body { font-family: Arial, sans-serif; color: #1f2937; font-size: 11pt; }
        .header { border-bottom: 3px solid #166534; padding-bottom: 10px; margin-bottom: 16px; }
        .company { color: #64748b; font-size: 10pt; text-transform: uppercase; letter-spacing: 1px; }
        h1 { color: #166534; font-size: 22pt; margin: 4px 0; text-align: center; }
        h2 { color: #166534; font-size: 14pt; margin: 16px 0 8px; }
        .meta { text-align: center; color: #475569; margin-bottom: 14px; }
        .summary { width: 100%; border-collapse: separate; border-spacing: 8px; margin: 12px 0 18px; }
        .summary td { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px; text-align: center; }
        .summary .label { color: #475569; font-size: 9pt; text-transform: uppercase; }
        .summary .value { font-weight: 700; color: #0f172a; font-size: 13pt; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #166534; color: #fff; padding: 7px 5px; border: 1px solid #14532d; font-size: 9.5pt; }
        td { padding: 6px 5px; border: 1px solid #cbd5e1; vertical-align: top; }
        tbody tr:nth-child(even) td { background: #f8fafc; }
        .center { text-align: center; }
        .right, .money { text-align: right; white-space: nowrap; }
        .product { font-weight: 600; }
        .total td { background: #dcfce7 !important; font-weight: 700; }
        .danger { color: #b91c1c; font-weight: 700; }
        .empty { text-align: center; color: #64748b; font-style: italic; padding: 18px; }
        .status-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 6px; }
        .note { margin-top: 14px; color: #64748b; font-size: 9pt; }
        .signatures { margin-top: 36px; border-collapse: collapse; }
        .signatures td { width: 50%; text-align: center; border: none; padding-top: 8px; }
        .sign-title { font-weight: 700; }
        .sign-space { height: 56px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="company">Văn phòng phẩm Online</div>
        <h1>BÁO CÁO DOANH THU - ĐƠN HÀNG</h1>
        <div class="meta">Kỳ báo cáo: <b>${escapeHtml(period)}</b> &nbsp; | &nbsp; Ngày xuất: ${escapeHtml(exportDate)}</div>
    </div>
    <table class="summary">
        <tr>
            <td><div class="label">Tổng đơn hàng</div><div class="value">${fmt(periodOrders)}</div></td>
            <td><div class="label">Đơn hoàn thành</div><div class="value">${fmt(statusSummary.completed)}</div></td>
            <td><div class="label">Đang vận chuyển</div><div class="value">${fmt(statusSummary.processing)}</div></td>
            <td><div class="label">Doanh thu hoàn thành</div><div class="value">${fmtCur(periodRevenue)}</div></td>
            <td><div class="label">Sản phẩm đã bán</div><div class="value">${fmt(whSummary.totalSold)}</div></td>
        </tr>
    </table>
    <h2>Thống kê trạng thái đơn hàng</h2>
    <table>
        <thead>
            <tr><th>Trạng thái</th><th>Số đơn</th><th>Tỉ lệ</th></tr>
        </thead>
        <tbody>
            ${statusRows}
            <tr class="total"><td>Tổng cộng</td><td class="center">${fmt(periodOrders)}</td><td class="right">${fmtCur(periodRevenue)}</td></tr>
        </tbody>
    </table>
    <h2>Chi tiết sản phẩm bán ra trong kỳ</h2>
    <table>
        <thead>
            <tr>
                <th>STT</th>
                <th>Sản phẩm</th>
                <th>Danh mục</th>
                <th>Tồn hiện tại</th>
                <th>SL bán</th>
                <th>Doanh thu</th>
                <th>SL nhập</th>
                <th>SL hư</th>
            </tr>
        </thead>
        <tbody>${detailRows}</tbody>
        <tfoot>
            <tr class="total">
                <td colspan="4">Tổng cộng</td>
                <td class="center">${fmt(whSummary.totalSold)}</td>
                <td class="money">${fmtCur(whSummary.totalRevenue)}</td>
                <td class="center">${fmt(whSummary.totalReceived)}</td>
                <td class="center danger">${fmt(whSummary.totalDamaged)}</td>
            </tr>
        </tfoot>
    </table>
    <div class="note">Ghi chú: Doanh thu lấy theo kỳ báo cáo đang lọc trên trang quản trị đơn hàng.</div>
    <table class="signatures">
        <tr>
            <td><div class="sign-title">Người lập báo cáo</div><div class="sign-space"></div><div>(Ký, ghi rõ họ tên)</div></td>
            <td><div class="sign-title">Quản trị viên</div><div class="sign-space"></div><div>(Ký, ghi rõ họ tên)</div></td>
        </tr>
    </table>
</body>
</html>`;

    downloadBlob('\ufeff' + html, `bao-cao-doanh-thu-${startDate || 'all'}-${endDate || 'all'}.doc`, 'application/msword;charset=utf-8');
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revenueSummary, setRevenueSummary] = useState(null);
    const [chartLoading, setChartLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [orderDetail, setOrderDetail] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('list');
    const [autoTick, setAutoTick] = useState(0);

    const defaults = getDefaultDateRange();
    const [startDate, setStartDate] = useState(defaults.startDate);
    const [endDate, setEndDate] = useState(defaults.endDate);
    const [appliedStart, setAppliedStart] = useState(defaults.startDate);
    const [appliedEnd, setAppliedEnd] = useState(defaults.endDate);

    const pageSize = 10;

    useEffect(() => { loadOrders(); }, [page, statusFilter, appliedStart, appliedEnd, autoTick]);
    useEffect(() => { loadRevenueSummary(); }, [appliedStart, appliedEnd, autoTick]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const params = { page, pageSize };
            if (statusFilter) params.status = statusFilter;
            if (appliedStart) params.startDate = appliedStart;
            if (appliedEnd) params.endDate = appliedEnd;
            const response = await orderApi.getAllOrders(params);
            setOrders(response.data.items || []);
            setTotalPages(response.data.totalPages || 0);
            setTotalCount(response.data.totalCount || 0);
        } catch (error) {
            console.error('Lỗi tải đơn hàng:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadRevenueSummary = async () => {
        setChartLoading(true);
        try {
            const params = {};
            if (appliedStart) params.startDate = appliedStart;
            if (appliedEnd) params.endDate = appliedEnd;
            const response = await orderApi.getRevenueSummary(params);
            setRevenueSummary(response.data);
        } catch (error) {
            console.error('Lỗi tải dữ liệu biểu đồ:', error);
        } finally {
            setChartLoading(false);
        }
    };

    const applyFilter = () => {
        setAppliedStart(startDate);
        setAppliedEnd(endDate);
        setPage(1);
    };

    const setPreset = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - (days - 1));
        const s = start.toISOString().split('T')[0];
        const e = end.toISOString().split('T')[0];
        setStartDate(s); setEndDate(e);
        setAppliedStart(s); setAppliedEnd(e);
        setPage(1);
    };

    const viewDetail = async (order) => {
        setSelectedOrder(order);
        setOrderDetail(null);
        setShowDetailModal(true);
        try {
            const response = await orderApi.getById(order.id);
            setOrderDetail(response.data);
        } catch (error) {
            console.error('Lỗi tải chi tiết đơn hàng:', error);
        }
    };

    const closeDetail = () => {
        setShowDetailModal(false);
        setSelectedOrder(null);
        setOrderDetail(null);
    };

    const handleApprove = async (orderId) => {
        if (!window.confirm('Duyệt đơn hàng này? Kho hàng sẽ bị trừ.')) return;
        setActionLoading(true);
        try {
            await orderApi.approve(orderId);
            await Promise.all([loadOrders(), loadRevenueSummary()]);
        } catch (error) {
            alert(error.response?.data?.message || 'Duyệt đơn hàng thất bại');
        } finally { setActionLoading(false); }
    };

    const handleReject = async (orderId) => {
        const reason = window.prompt('Lý do từ chối (có thể để trống):');
        if (reason === null) return;
        setActionLoading(true);
        try {
            await orderApi.reject(orderId, reason);
            await Promise.all([loadOrders(), loadRevenueSummary()]);
        } catch (error) {
            alert(error.response?.data?.message || 'Từ chối đơn hàng thất bại');
        } finally { setActionLoading(false); }
    };

    const exportReportCSV = async () => {
        try {
            const [whRes] = await Promise.all([
                warehouseApi.getReport({ startDate: appliedStart, endDate: appliedEnd })
            ]);
            const whReport = whRes.data;
            const summary = whReport?.summary;
            const details = whReport?.details || [];

            const bom = '﻿';
            const lines = [
                `"Báo cáo doanh thu - Đơn hàng"`,
                `"Kỳ báo cáo:","${appliedStart || 'Tất cả'} đến ${appliedEnd || 'Tất cả'}"`,
                `"Tổng đơn hàng:","${periodOrders}"`,
                `"Doanh thu hoàn thành:","${periodRevenue}"`,
                '',
                '"Sản phẩm","Danh mục","Tồn kho hiện tại","SL bán","Doanh thu (VNĐ)","SL nhập","SL hư hỏng"',
                ...details.map(d =>
                    `"${d.productName}","${d.categoryName}","${d.currentStock}","${d.quantitySold}","${d.revenue}","${d.quantityReceived}","${d.quantityDamaged}"`
                ),
                '',
                '"Tổng cộng","","","' + (summary?.totalSold ?? 0) + '","' + (summary?.totalRevenue ?? 0) + '","' + (summary?.totalReceived ?? 0) + '","' + (summary?.totalDamaged ?? 0) + '"',
            ];

            const csv = bom + lines.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bao-cao-doanh-thu-${appliedStart || 'all'}-${appliedEnd || 'all'}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert('Không thể xuất báo cáo. Vui lòng thử lại.');
        }
    };

    const exportReportDOC = async () => {
        try {
            const whRes = await warehouseApi.getReport({ startDate: appliedStart, endDate: appliedEnd });
            exportOrderReportDoc({
                revenueSummary,
                warehouseReport: whRes.data,
                startDate: appliedStart,
                endDate: appliedEnd,
                periodOrders,
                periodRevenue,
            });
        } catch (err) {
            alert('Không thể xuất báo cáo DOC. Vui lòng thử lại.');
        }
    };

    const handleCancel = async (orderId) => {
        if (!window.confirm('Hủy đơn hàng này?')) return;
        setActionLoading(true);
        try {
            await orderApi.cancel(orderId);
            await Promise.all([loadOrders(), loadRevenueSummary()]);
        } catch (error) {
            alert(error.response?.data?.message || 'Hủy đơn hàng thất bại');
        } finally { setActionLoading(false); }
    };

    const formatDate = (dateStr) => new Date(dateStr).toLocaleString('vi-VN');
    const formatDateShort = (dateStr) => new Date(dateStr).toLocaleDateString('vi-VN');
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + ' đ';

    const buildRevenueChartData = () => {
        if (!revenueSummary?.revenueByDay?.length) return null;
        const labels = revenueSummary.revenueByDay.map(d => formatDateShort(d.date));
        return {
            labels,
            datasets: [{
                label: 'Doanh thu (đ)',
                data: revenueSummary.revenueByDay.map(d => d.revenue),
                backgroundColor: 'rgba(40, 167, 69, 0.2)',
                borderColor: '#28a745', borderWidth: 2, fill: true, tension: 0.3,
                pointBackgroundColor: '#28a745', pointRadius: 4,
            }]
        };
    };

    const buildOrdersChartData = () => {
        if (!revenueSummary?.ordersByDay?.length) return null;
        const labels = revenueSummary.ordersByDay.map(d => formatDateShort(d.date));
        return {
            labels,
            datasets: [
                { label: 'Hoàn thành', data: revenueSummary.ordersByDay.map(d => d.completed), backgroundColor: '#28a745', stack: 'orders' },
                { label: 'Đang vận chuyển', data: revenueSummary.ordersByDay.map(d => d.processing), backgroundColor: '#17a2b8', stack: 'orders' },
                { label: 'Chờ duyệt', data: revenueSummary.ordersByDay.map(d => d.pending), backgroundColor: '#ffc107', stack: 'orders' },
                { label: 'Đã hủy/Từ chối', data: revenueSummary.ordersByDay.map(d => d.cancelled + d.rejected), backgroundColor: '#dc3545', stack: 'orders' },
            ]
        };
    };

    const buildStatusDoughnutData = () => {
        if (!revenueSummary?.statusSummary) return null;
        const s = revenueSummary.statusSummary;
        const values = [s.pending, s.processing, s.completed, s.cancelled, s.rejected];
        if (values.every(v => v === 0)) return null;
        return {
            labels: ['Chờ duyệt', 'Đang vận chuyển', 'Hoàn thành', 'Đã hủy', 'Từ chối'],
            datasets: [{
                data: values,
                backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#6c757d', '#dc3545'],
                borderWidth: 2, borderColor: '#fff',
            }]
        };
    };

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString('vi-VN') } } }
    };
    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
    };
    const doughnutOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed} đơn` } } }
    };

    const revenueChartData = buildRevenueChartData();
    const ordersChartData = buildOrdersChartData();
    const doughnutData = buildStatusDoughnutData();
    const periodRevenue = revenueSummary?.statusSummary?.totalRevenue ?? 0;
    const periodOrders = revenueSummary?.statusSummary?.totalOrders ?? 0;

    const renderPagination = () => {
        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, page - 2);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        if (endPage - startPage < maxVisible - 1) startPage = Math.max(1, endPage - maxVisible + 1);
        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <li key={i} className={`page-item ${page === i ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(i)}>{i}</button>
                </li>
            );
        }
        return pages;
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6 d-flex align-items-center">
                            <h1 className="m-0 mr-2">Quản lý đơn hàng</h1>
                            <span className="badge badge-warning" title="Trạng thái đơn hàng tự động tăng mỗi 5 giây">
                                <i className="fas fa-sync-alt fa-spin mr-1" style={{ fontSize: '0.75em' }}></i>Demo
                            </span>
                        </div>
                        <div className="col-sm-6">
                            <ol className="breadcrumb float-sm-right">
                                <li className="breadcrumb-item"><a href="/admin">Trang chủ</a></li>
                                <li className="breadcrumb-item active">Đơn hàng</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {/* Bộ lọc thời gian */}
                    <div className="card card-outline card-primary mb-3">
                        <div className="card-header">
                            <h3 className="card-title"><i className="fas fa-filter mr-2"></i>Bộ lọc thời gian</h3>
                        </div>
                        <div className="card-body pb-2">
                            <div className="row align-items-end">
                                <div className="col-md-3 col-sm-6 mb-2">
                                    <label className="font-weight-bold small mb-1">Từ ngày</label>
                                    <input type="date" className="form-control form-control-sm" value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)} />
                                </div>
                                <div className="col-md-3 col-sm-6 mb-2">
                                    <label className="font-weight-bold small mb-1">Đến ngày</label>
                                    <input type="date" className="form-control form-control-sm" value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)} />
                                </div>
                                <div className="col-md-2 col-sm-4 mb-2">
                                    <button className="btn btn-primary btn-sm btn-block" onClick={applyFilter}>
                                        <i className="fas fa-search mr-1"></i>Áp dụng
                                    </button>
                                </div>
                                <div className="col-md-4 col-sm-8 mb-2">
                                    <div className="btn-group btn-group-sm w-100">
                                        <button className="btn btn-outline-secondary" onClick={() => setPreset(7)}>7 ngày</button>
                                        <button className="btn btn-outline-secondary" onClick={() => setPreset(30)}>30 ngày</button>
                                        <button className="btn btn-outline-secondary" onClick={() => setPreset(90)}>3 tháng</button>
                                        <button className="btn btn-outline-secondary" onClick={() => {
                                            setStartDate(''); setEndDate('');
                                            setAppliedStart(''); setAppliedEnd(''); setPage(1);
                                        }}>Tất cả</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Thống kê nhanh */}
                    {revenueSummary && (
                        <div className="row mb-3">
                            <div className="col-lg-3 col-md-6 col-6">
                                <div className="info-box shadow-sm">
                                    <span className="info-box-icon bg-secondary elevation-1"><i className="fas fa-list-ol"></i></span>
                                    <div className="info-box-content">
                                        <span className="info-box-text">Tổng đơn (kỳ)</span>
                                        <span className="info-box-number">{periodOrders}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 col-6">
                                <div className="info-box shadow-sm">
                                    <span className="info-box-icon bg-warning elevation-1"><i className="fas fa-clock"></i></span>
                                    <div className="info-box-content">
                                        <span className="info-box-text">Chờ duyệt</span>
                                        <span className="info-box-number">{revenueSummary.statusSummary?.pending ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 col-6">
                                <div className="info-box shadow-sm">
                                    <span className="info-box-icon bg-success elevation-1"><i className="fas fa-check-circle"></i></span>
                                    <div className="info-box-content">
                                        <span className="info-box-text">Hoàn thành</span>
                                        <span className="info-box-number">{revenueSummary.statusSummary?.completed ?? 0}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-3 col-md-6 col-6">
                                <div className="info-box shadow-sm">
                                    <span className="info-box-icon bg-primary elevation-1"><i className="fas fa-dollar-sign"></i></span>
                                    <div className="info-box-content">
                                        <span className="info-box-text">Doanh thu (kỳ)</span>
                                        <span className="info-box-number" style={{ fontSize: '1rem' }}>{formatCurrency(periodRevenue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header p-0 bg-primary">
                            <ul className="nav nav-tabs" role="tablist">
                                <li className="nav-item">
                                    <a className={`nav-link ${activeTab === 'list' ? 'active bg-white text-primary font-weight-bold' : 'text-white'}`} href="#"
                                        onClick={(e) => { e.preventDefault(); setActiveTab('list'); }}>
                                        <i className="fas fa-list mr-1"></i>Danh sách đơn hàng
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a className={`nav-link ${activeTab === 'chart' ? 'active bg-white text-primary font-weight-bold' : 'text-white'}`} href="#"
                                        onClick={(e) => { e.preventDefault(); setActiveTab('chart'); }}>
                                        <i className="fas fa-chart-bar mr-1"></i>Biểu đồ thống kê
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {activeTab === 'list' && (
                            <>
                                <div className="card-header border-top-0">
                                    <div className="row align-items-center">
                                        <div className="col-md-6">
                                            <h3 className="card-title">Tổng: <strong>{totalCount}</strong> đơn hàng</h3>
                                        </div>
                                        <div className="col-md-6 text-right">
                                            <div className="form-inline justify-content-end">
                                                <label className="mr-2 mb-0 font-weight-bold small">Trạng thái:</label>
                                                <select className="form-control form-control-sm" value={statusFilter}
                                                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
                                                    <option value="">Tất cả trạng thái</option>
                                                    <option value="Pending">Chờ duyệt</option>
                                                    <option value="Processing">Đang vận chuyển</option>
                                                    <option value="Completed">Hoàn thành</option>
                                                    <option value="Cancelled">Đã hủy</option>
                                                    <option value="Rejected">Từ chối</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body p-0">
                                    {loading ? (
                                        <div className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                            <p className="mt-2 text-muted">Đang tải dữ liệu...</p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-striped table-hover table-sm mb-0">
                                                <thead className="thead-dark">
                                                    <tr>
                                                        <th style={{ width: '70px' }} className="text-center">Mã đơn</th>
                                                        <th style={{ width: '150px' }}>Ngày đặt</th>
                                                        <th>Địa chỉ giao hàng</th>
                                                        <th style={{ width: '130px' }} className="text-right">Tổng tiền</th>
                                                        <th style={{ width: '120px' }} className="text-center">Trạng thái</th>
                                                        <th style={{ width: '220px' }} className="text-center">Thao tác</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {orders.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="text-center py-4 text-muted">
                                                                <i className="fas fa-inbox fa-2x mb-2 d-block"></i>
                                                                Không có đơn hàng nào trong khoảng thời gian này
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        orders.map(order => {
                                                            const cfg = statusConfig[order.status] || { label: order.status, badge: 'secondary' };
                                                            return (
                                                                <tr key={order.id}>
                                                                    <td className="text-center font-weight-bold">#{order.id}</td>
                                                                    <td className="small">{formatDate(order.orderDate)}</td>
                                                                    <td className="small">{order.shippingAddress || <em className="text-muted">Không có</em>}</td>
                                                                    <td className="text-right font-weight-bold">{formatCurrency(order.totalAmount)}</td>
                                                                    <td className="text-center">
                                                                        <span className={`badge badge-${cfg.badge} px-2 py-1`}>{cfg.label}</span>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <button className="btn btn-xs btn-outline-secondary mr-1" title="Xem chi tiết"
                                                                            onClick={() => viewDetail(order)}>
                                                                            <i className="fas fa-eye"></i>
                                                                        </button>
                                                                        {order.status === 'Pending' && (
                                                                            <>
                                                                                <button className="btn btn-xs btn-success mr-1" onClick={() => handleApprove(order.id)} disabled={actionLoading}>
                                                                                    <i className="fas fa-check mr-1"></i>Duyệt
                                                                                </button>
                                                                                <button className="btn btn-xs btn-danger mr-1" onClick={() => handleReject(order.id)} disabled={actionLoading}>
                                                                                    <i className="fas fa-times mr-1"></i>Từ chối
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                        {order.status === 'Processing' && (
                                                                            <span className="badge badge-info mr-1">
                                                                                <i className="fas fa-truck mr-1"></i>Chờ khách nhận hàng
                                                                            </span>
                                                                        )}
                                                                        {(order.status === 'Pending' || order.status === 'Processing') && (
                                                                            <button className="btn btn-xs btn-warning" onClick={() => handleCancel(order.id)} disabled={actionLoading}>
                                                                                <i className="fas fa-ban mr-1"></i>Hủy
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {!loading && totalPages > 1 && (
                                    <div className="card-footer">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-muted small">
                                                Hiển thị trang <strong>{page}</strong> / <strong>{totalPages}</strong> ({totalCount} đơn hàng)
                                            </span>
                                            <nav>
                                                <ul className="pagination pagination-sm mb-0">
                                                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => setPage(1)}>«</button>
                                                    </li>
                                                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => setPage(page - 1)}>‹</button>
                                                    </li>
                                                    {renderPagination()}
                                                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => setPage(page + 1)}>›</button>
                                                    </li>
                                                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                                        <button className="page-link" onClick={() => setPage(totalPages)}>»</button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeTab === 'chart' && (
                            <div className="card-body">
                                <div className="d-flex justify-content-end mb-3">
                                    <button className="btn btn-success btn-sm" onClick={exportReportCSV}>
                                        <i className="fas fa-file-csv mr-1"></i>Xuất báo cáo CSV
                                    </button>
                                    <button className="btn btn-primary btn-sm ml-2" onClick={exportReportDOC} disabled={!revenueSummary}>
                                        <i className="fas fa-file-word mr-1"></i>Xuất báo cáo DOC
                                    </button>
                                </div>
                                {chartLoading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="mt-2 text-muted">Đang tải biểu đồ...</p>
                                    </div>
                                ) : (
                                    <div className="row">
                                        <div className="col-lg-8 col-12 mb-4">
                                            <div className="card card-outline card-success mb-0">
                                                <div className="card-header">
                                                    <h3 className="card-title"><i className="fas fa-chart-area mr-2 text-success"></i>Doanh thu theo ngày</h3>
                                                </div>
                                                <div className="card-body">
                                                    {revenueChartData ? (
                                                        <div style={{ height: '280px' }}>
                                                            <Line data={revenueChartData} options={chartOptions} />
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-muted">Không có dữ liệu doanh thu</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-lg-4 col-12 mb-4">
                                            <div className="card card-outline card-info mb-0">
                                                <div className="card-header">
                                                    <h3 className="card-title"><i className="fas fa-chart-pie mr-2 text-info"></i>Phân bổ trạng thái</h3>
                                                </div>
                                                <div className="card-body">
                                                    {doughnutData ? (
                                                        <div style={{ height: '280px' }}>
                                                            <Doughnut data={doughnutData} options={doughnutOptions} />
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-muted">Không có dữ liệu</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-12 mb-4">
                                            <div className="card card-outline card-primary mb-0">
                                                <div className="card-header">
                                                    <h3 className="card-title"><i className="fas fa-chart-bar mr-2 text-primary"></i>Số lượng đơn hàng theo ngày</h3>
                                                </div>
                                                <div className="card-body">
                                                    {ordersChartData ? (
                                                        <div style={{ height: '260px' }}>
                                                            <Bar data={ordersChartData} options={barOptions} />
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-4 text-muted">Không có dữ liệu</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {revenueSummary?.statusSummary && (
                                            <div className="col-12">
                                                <div className="card card-outline card-secondary mb-0">
                                                    <div className="card-header">
                                                        <h3 className="card-title"><i className="fas fa-table mr-2"></i>Tổng kết kỳ đã chọn</h3>
                                                    </div>
                                                    <div className="card-body p-0">
                                                        <table className="table table-bordered table-sm mb-0">
                                                            <thead className="thead-light">
                                                                <tr>
                                                                    <th>Trạng thái</th>
                                                                    <th className="text-center">Số đơn</th>
                                                                    <th className="text-right">Tỉ lệ</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {Object.entries({
                                                                    Pending: revenueSummary.statusSummary.pending,
                                                                    Processing: revenueSummary.statusSummary.processing,
                                                                    Completed: revenueSummary.statusSummary.completed,
                                                                    Cancelled: revenueSummary.statusSummary.cancelled,
                                                                    Rejected: revenueSummary.statusSummary.rejected,
                                                                }).map(([key, val]) => {
                                                                    const cfg = statusConfig[key];
                                                                    const pct = periodOrders > 0 ? ((val / periodOrders) * 100).toFixed(1) : 0;
                                                                    return (
                                                                        <tr key={key}>
                                                                            <td><span className={`badge badge-${cfg.badge} mr-2`}>{cfg.label}</span></td>
                                                                            <td className="text-center"><strong>{val}</strong></td>
                                                                            <td className="text-right">
                                                                                <div className="progress" style={{ height: '14px' }}>
                                                                                    <div className={`progress-bar bg-${cfg.badge}`} style={{ width: `${pct}%` }}>{pct}%</div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                                <tr className="table-active font-weight-bold">
                                                                    <td>Tổng cộng</td>
                                                                    <td className="text-center">{periodOrders}</td>
                                                                    <td className="text-right">{formatCurrency(periodRevenue)}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {showDetailModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header bg-primary text-white">
                                    <h5 className="modal-title">
                                        <i className="fas fa-receipt mr-2"></i>Chi tiết đơn hàng #{selectedOrder?.id}
                                    </h5>
                                    <button type="button" className="close text-white" onClick={closeDetail}>
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <div className="modal-body">
                                    {!orderDetail ? (
                                        <div className="text-center py-4">
                                            <div className="spinner-border text-primary" role="status"></div>
                                            <p className="mt-2 text-muted">Đang tải...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="row mb-3">
                                                <div className="col-md-4">
                                                    <div className="info-box shadow-none bg-light mb-0">
                                                        <div className="info-box-content">
                                                            <span className="info-box-text text-muted">Ngày đặt hàng</span>
                                                            <span className="info-box-number" style={{ fontSize: '0.9rem' }}>
                                                                {formatDate(orderDetail.order.orderDate)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="info-box shadow-none bg-light mb-0">
                                                        <div className="info-box-content">
                                                            <span className="info-box-text text-muted">Trạng thái</span>
                                                            <span className="info-box-number" style={{ fontSize: '0.9rem' }}>
                                                                <span className={`badge badge-${(statusConfig[orderDetail.order.status] || {}).badge || 'secondary'}`}>
                                                                    {(statusConfig[orderDetail.order.status] || { label: orderDetail.order.status }).label}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-4">
                                                    <div className="info-box shadow-none bg-light mb-0">
                                                        <div className="info-box-content">
                                                            <span className="info-box-text text-muted">Tổng tiền</span>
                                                            <span className="info-box-number text-primary" style={{ fontSize: '1rem' }}>
                                                                {formatCurrency(orderDetail.order.totalAmount)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {orderDetail.order.shippingAddress && (
                                                    <div className="col-12 mt-2">
                                                        <small className="text-muted"><i className="fas fa-map-marker-alt mr-1"></i>Địa chỉ giao hàng:</small>
                                                        <p className="mb-0 font-weight-bold">{orderDetail.order.shippingAddress}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <table className="table table-bordered table-sm">
                                                <thead className="thead-dark">
                                                    <tr>
                                                        <th>Sản phẩm</th>
                                                        <th className="text-right" style={{ width: '120px' }}>Đơn giá</th>
                                                        <th className="text-center" style={{ width: '80px' }}>SL</th>
                                                        <th className="text-right" style={{ width: '130px' }}>Thành tiền</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(orderDetail.details || []).map(item => (
                                                        <tr key={item.id}>
                                                            <td>{item.productName}</td>
                                                            <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                                                            <td className="text-center">{item.quantity}</td>
                                                            <td className="text-right font-weight-bold">{formatCurrency(item.unitPrice * item.quantity)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-light">
                                                    <tr>
                                                        <td colSpan={3} className="text-right font-weight-bold">Tổng cộng:</td>
                                                        <td className="text-right font-weight-bold text-primary">
                                                            {formatCurrency(orderDetail.order.totalAmount)}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>

                                            {orderDetail.order.status === 'Pending' && (
                                                <div className="alert alert-warning d-flex justify-content-between align-items-center mb-0">
                                                    <span><i className="fas fa-clock mr-1"></i>Đơn hàng đang chờ duyệt</span>
                                                    <div>
                                                        <button className="btn btn-sm btn-success mr-2"
                                                            onClick={() => { closeDetail(); handleApprove(orderDetail.order.id); }} disabled={actionLoading}>
                                                            <i className="fas fa-check mr-1"></i>Duyệt
                                                        </button>
                                                        <button className="btn btn-sm btn-danger"
                                                            onClick={() => { closeDetail(); handleReject(orderDetail.order.id); }} disabled={actionLoading}>
                                                            <i className="fas fa-times mr-1"></i>Từ chối
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {orderDetail.order.status === 'Processing' && (
                                                <div className="alert alert-info d-flex justify-content-between align-items-center mb-0">
                                                    <span><i className="fas fa-truck mr-1"></i>Đơn hàng đang vận chuyển, chờ khách xác nhận đã nhận hàng</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={closeDetail}>
                                        <i className="fas fa-times mr-1"></i>Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    );
};

export default Orders;
