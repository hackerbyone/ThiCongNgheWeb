import React, { useState, useEffect, useCallback } from 'react';
import { warehouseApi, productApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0);
const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0);

const getDefaultRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(1);
    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
};

const exportCSV = (rows, filename) => {
    const bom = '﻿';
    const csv = bom + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export default function Warehouse() {
    const { isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('inventory');

    // ── Inventory ──────────────────────────────────────────────────────
    const [inventory, setInventory] = useState([]);
    const [invLoading, setInvLoading] = useState(false);
    const [invSearch, setInvSearch] = useState('');

    // ── Receipts ───────────────────────────────────────────────────────
    const [receipts, setReceipts] = useState([]);
    const [recLoading, setRecLoading] = useState(false);
    const [recPage, setRecPage] = useState(1);
    const [recTotalPages, setRecTotalPages] = useState(0);
    const [recTotal, setRecTotal] = useState(0);
    const [recStartDate, setRecStartDate] = useState('');
    const [recEndDate, setRecEndDate] = useState('');
    const [showRecModal, setShowRecModal] = useState(false);
    const [editReceipt, setEditReceipt] = useState(null);
    const [recForm, setRecForm] = useState({ productId: '', quantity: 1, unitCost: 0, supplier: '', receivedDate: '', notes: '' });
    const [products, setProducts] = useState([]);
    const [recError, setRecError] = useState('');

    // ── Damaged ────────────────────────────────────────────────────────
    const [damaged, setDamaged] = useState([]);
    const [dmgLoading, setDmgLoading] = useState(false);
    const [dmgPage, setDmgPage] = useState(1);
    const [dmgTotalPages, setDmgTotalPages] = useState(0);
    const [dmgTotal, setDmgTotal] = useState(0);
    const [dmgStartDate, setDmgStartDate] = useState('');
    const [dmgEndDate, setDmgEndDate] = useState('');
    const [showDmgModal, setShowDmgModal] = useState(false);
    const [dmgForm, setDmgForm] = useState({ productId: '', quantity: 1, reason: '', reportedDate: '', notes: '' });
    const [dmgError, setDmgError] = useState('');

    // ── Report ─────────────────────────────────────────────────────────
    const defaults = getDefaultRange();
    const [rptStart, setRptStart] = useState(defaults.start);
    const [rptEnd, setRptEnd] = useState(defaults.end);
    const [report, setReport] = useState(null);
    const [rptLoading, setRptLoading] = useState(false);

    // Load all products list for dropdowns
    useEffect(() => {
        productApi.getAll({ pageSize: 999 }).then(r => setProducts(r.data.items || [])).catch(() => {});
    }, []);

    // ── Load inventory ─────────────────────────────────────────────────
    const loadInventory = useCallback(async () => {
        setInvLoading(true);
        try {
            const r = await warehouseApi.getInventory();
            setInventory(r.data || []);
        } catch { } finally { setInvLoading(false); }
    }, []);

    // ── Load receipts ──────────────────────────────────────────────────
    const loadReceipts = useCallback(async () => {
        setRecLoading(true);
        try {
            const params = { page: recPage, pageSize: 10 };
            if (recStartDate) params.startDate = recStartDate;
            if (recEndDate) params.endDate = recEndDate;
            const r = await warehouseApi.getReceipts(params);
            setReceipts(r.data.items || []);
            setRecTotalPages(r.data.totalPages || 0);
            setRecTotal(r.data.totalCount || 0);
        } catch { } finally { setRecLoading(false); }
    }, [recPage, recStartDate, recEndDate]);

    // ── Load damaged ───────────────────────────────────────────────────
    const loadDamaged = useCallback(async () => {
        setDmgLoading(true);
        try {
            const params = { page: dmgPage, pageSize: 10 };
            if (dmgStartDate) params.startDate = dmgStartDate;
            if (dmgEndDate) params.endDate = dmgEndDate;
            const r = await warehouseApi.getDamaged(params);
            setDamaged(r.data.items || []);
            setDmgTotalPages(r.data.totalPages || 0);
            setDmgTotal(r.data.totalCount || 0);
        } catch { } finally { setDmgLoading(false); }
    }, [dmgPage, dmgStartDate, dmgEndDate]);

    // ── Load report ────────────────────────────────────────────────────
    const loadReport = useCallback(async () => {
        setRptLoading(true);
        try {
            const r = await warehouseApi.getReport({ startDate: rptStart, endDate: rptEnd });
            setReport(r.data);
        } catch { } finally { setRptLoading(false); }
    }, [rptStart, rptEnd]);

    useEffect(() => { if (activeTab === 'inventory') loadInventory(); }, [activeTab, loadInventory]);
    useEffect(() => { if (activeTab === 'receipts') loadReceipts(); }, [activeTab, loadReceipts]);
    useEffect(() => { if (activeTab === 'damaged') loadDamaged(); }, [activeTab, loadDamaged]);
    useEffect(() => { if (activeTab === 'report') loadReport(); }, [activeTab, loadReport]);

    // ── Receipt CRUD ───────────────────────────────────────────────────
    const openRecModal = (rec = null) => {
        if (rec) {
            setEditReceipt(rec);
            setRecForm({
                productId: rec.productId, quantity: rec.quantity, unitCost: rec.unitCost,
                supplier: rec.supplier || '', receivedDate: rec.receivedDate?.split('T')[0] || '', notes: rec.notes || ''
            });
        } else {
            setEditReceipt(null);
            setRecForm({ productId: '', quantity: 1, unitCost: 0, supplier: '', receivedDate: new Date().toISOString().split('T')[0], notes: '' });
        }
        setRecError('');
        setShowRecModal(true);
    };

    const submitReceipt = async (e) => {
        e.preventDefault();
        setRecError('');
        try {
            const payload = { ...recForm, productId: parseInt(recForm.productId), quantity: parseInt(recForm.quantity), unitCost: parseFloat(recForm.unitCost) };
            if (editReceipt) await warehouseApi.updateReceipt(editReceipt.id, payload);
            else await warehouseApi.createReceipt(payload);
            setShowRecModal(false);
            loadReceipts();
            loadInventory();
        } catch (err) {
            setRecError(err.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const deleteReceipt = async (id) => {
        if (!window.confirm('Xóa phiếu nhập này? Tồn kho sẽ được hoàn lại.')) return;
        try { await warehouseApi.deleteReceipt(id); loadReceipts(); loadInventory(); }
        catch (err) { alert(err.response?.data?.message || 'Xóa thất bại'); }
    };

    // ── Damaged CRUD ───────────────────────────────────────────────────
    const openDmgModal = () => {
        setDmgForm({ productId: '', quantity: 1, reason: '', reportedDate: new Date().toISOString().split('T')[0], notes: '' });
        setDmgError('');
        setShowDmgModal(true);
    };

    const submitDamaged = async (e) => {
        e.preventDefault();
        setDmgError('');
        try {
            const payload = { ...dmgForm, productId: parseInt(dmgForm.productId), quantity: parseInt(dmgForm.quantity) };
            await warehouseApi.createDamaged(payload);
            setShowDmgModal(false);
            loadDamaged();
            loadInventory();
        } catch (err) {
            setDmgError(err.response?.data?.message || 'Thao tác thất bại');
        }
    };

    const deleteDamaged = async (id) => {
        if (!window.confirm('Xóa bản ghi hư hỏng này? Tồn kho sẽ được hoàn lại.')) return;
        try { await warehouseApi.deleteDamaged(id); loadDamaged(); loadInventory(); }
        catch (err) { alert(err.response?.data?.message || 'Xóa thất bại'); }
    };

    // ── Export report CSV ──────────────────────────────────────────────
    const exportReport = () => {
        if (!report) return;
        const rows = [
            [`Báo cáo kho hàng: ${rptStart} đến ${rptEnd}`],
            [],
            ['Tổng nhập', 'Tổng bán', 'Tổng hư hỏng', 'Doanh thu', 'Tổng chi phí nhập'],
            [report.summary.totalReceived, report.summary.totalSold, report.summary.totalDamaged,
             report.summary.totalRevenue, report.summary.totalCost],
            [],
            ['Sản phẩm', 'Danh mục', 'Tồn kho hiện tại', 'SL Nhập', 'Chi phí nhập', 'SL Bán', 'Doanh thu bán', 'SL Hư hỏng'],
            ...(report.details || []).map(d => [
                d.productName, d.categoryName, d.currentStock,
                d.quantityReceived, d.totalCostReceived,
                d.quantitySold, d.revenue,
                d.quantityDamaged
            ])
        ];
        exportCSV(rows, `bao-cao-kho-${rptStart}-${rptEnd}.csv`);
    };

    const exportInventory = () => {
        const filtered = inventory.filter(i => !invSearch || i.name.toLowerCase().includes(invSearch.toLowerCase()) || i.categoryName.toLowerCase().includes(invSearch.toLowerCase()));
        const rows = [
            ['Tồn kho hiện tại - ' + new Date().toLocaleDateString('vi-VN')],
            [],
            ['Sản phẩm', 'Danh mục', 'Tồn kho', 'Tổng đã nhập', 'Tổng đã bán', 'Tổng hư hỏng'],
            ...filtered.map(i => [i.name, i.categoryName, i.stock, i.totalReceived, i.totalSold, i.totalDamaged])
        ];
        exportCSV(rows, `ton-kho-${new Date().toISOString().split('T')[0]}.csv`);
    };

    // ── Pagination helper ──────────────────────────────────────────────
    const Pagination = ({ page, totalPages, onPage }) => (
        <ul className="pagination mb-0">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => onPage(page - 1)}>‹</button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => onPage(p)}>{p}</button>
                </li>
            ))}
            <li className={`page-item ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => onPage(page + 1)}>›</button>
            </li>
        </ul>
    );

    const filteredInventory = inventory.filter(i =>
        !invSearch || i.name.toLowerCase().includes(invSearch.toLowerCase()) ||
        i.categoryName.toLowerCase().includes(invSearch.toLowerCase())
    );

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0"><i className="fas fa-warehouse mr-2"></i>Quản lý kho hàng</h1>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    {/* Tabs */}
                    <ul className="nav nav-tabs mb-3">
                        {[
                            { key: 'inventory', icon: 'fas fa-boxes', label: 'Tồn kho' },
                            { key: 'receipts',  icon: 'fas fa-truck-loading', label: 'Nhập kho' },
                            { key: 'damaged',   icon: 'fas fa-exclamation-triangle', label: 'Hư hỏng' },
                            { key: 'report',    icon: 'fas fa-chart-bar', label: 'Báo cáo & Xuất' },
                        ].map(t => (
                            <li key={t.key} className="nav-item">
                                <button className={`nav-link ${activeTab === t.key ? 'active' : ''}`}
                                    onClick={() => setActiveTab(t.key)}>
                                    <i className={`${t.icon} mr-1`}></i>{t.label}
                                </button>
                            </li>
                        ))}
                    </ul>

                    {/* ── TAB: Tồn kho ── */}
                    {activeTab === 'inventory' && (
                        <div className="card">
                            <div className="card-header">
                                <div className="row align-items-center">
                                    <div className="col-md-5">
                                        <h3 className="card-title mb-0">Danh sách tồn kho</h3>
                                    </div>
                                    <div className="col-md-4">
                                        <input className="form-control form-control-sm" placeholder="Tìm sản phẩm, danh mục..."
                                            value={invSearch} onChange={e => setInvSearch(e.target.value)} />
                                    </div>
                                    <div className="col-md-3 text-right">
                                        <button className="btn btn-sm btn-success mr-1" onClick={loadInventory}>
                                            <i className="fas fa-sync mr-1"></i>Làm mới
                                        </button>
                                        <button className="btn btn-sm btn-info" onClick={exportInventory}>
                                            <i className="fas fa-file-csv mr-1"></i>Xuất CSV
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {invLoading ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                ) : (
                                    <table className="table table-bordered table-striped mb-0">
                                        <thead className="thead-light">
                                            <tr>
                                                <th>Sản phẩm</th>
                                                <th>Danh mục</th>
                                                <th className="text-center">Tồn kho</th>
                                                <th className="text-center">Đã nhập</th>
                                                <th className="text-center">Đã bán</th>
                                                <th className="text-center">Hư hỏng</th>
                                                <th className="text-center">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredInventory.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center text-muted py-4">Không có dữ liệu</td></tr>
                                            ) : filteredInventory.map(item => (
                                                <tr key={item.id}>
                                                    <td><strong>{item.name}</strong></td>
                                                    <td><span className="badge badge-secondary">{item.categoryName}</span></td>
                                                    <td className="text-center">
                                                        <strong className={item.stock <= 10 ? 'text-danger' : item.stock <= 50 ? 'text-warning' : 'text-success'}>
                                                            {fmt(item.stock)}
                                                        </strong>
                                                    </td>
                                                    <td className="text-center text-info">{fmt(item.totalReceived)}</td>
                                                    <td className="text-center text-success">{fmt(item.totalSold)}</td>
                                                    <td className="text-center text-danger">{fmt(item.totalDamaged)}</td>
                                                    <td className="text-center">
                                                        {item.stock === 0 ? (
                                                            <span className="badge badge-danger">Hết hàng</span>
                                                        ) : item.stock <= 10 ? (
                                                            <span className="badge badge-warning">Sắp hết</span>
                                                        ) : (
                                                            <span className="badge badge-success">Còn hàng</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="card-footer text-muted">
                                Tổng: {filteredInventory.length} sản phẩm •
                                Sắp hết hàng: {filteredInventory.filter(i => i.stock > 0 && i.stock <= 10).length} •
                                Hết hàng: {filteredInventory.filter(i => i.stock === 0).length}
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Nhập kho ── */}
                    {activeTab === 'receipts' && (
                        <div className="card">
                            <div className="card-header">
                                <div className="row align-items-center">
                                    <div className="col-md-4">
                                        <h3 className="card-title mb-0">Phiếu nhập kho</h3>
                                    </div>
                                    <div className="col-md-5">
                                        <div className="input-group input-group-sm">
                                            <input type="date" className="form-control" value={recStartDate} onChange={e => { setRecStartDate(e.target.value); setRecPage(1); }} />
                                            <div className="input-group-prepend input-group-append">
                                                <span className="input-group-text">đến</span>
                                            </div>
                                            <input type="date" className="form-control" value={recEndDate} onChange={e => { setRecEndDate(e.target.value); setRecPage(1); }} />
                                        </div>
                                    </div>
                                    <div className="col-md-3 text-right">
                                        <button className="btn btn-success btn-sm" onClick={() => openRecModal()}>
                                            <i className="fas fa-plus mr-1"></i>Nhập hàng
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {recLoading ? (
                                    <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                ) : (
                                    <table className="table table-bordered table-striped mb-0">
                                        <thead className="thead-light">
                                            <tr>
                                                <th>Ngày nhập</th>
                                                <th>Sản phẩm</th>
                                                <th>Danh mục</th>
                                                <th className="text-center">SL</th>
                                                <th className="text-right">Đơn giá nhập</th>
                                                <th className="text-right">Thành tiền</th>
                                                <th>Nhà cung cấp</th>
                                                <th>Ghi chú</th>
                                                <th style={{ width: 100 }}>Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receipts.length === 0 ? (
                                                <tr><td colSpan="9" className="text-center text-muted py-4">Chưa có phiếu nhập nào</td></tr>
                                            ) : receipts.map(r => (
                                                <tr key={r.id}>
                                                    <td>{new Date(r.receivedDate).toLocaleDateString('vi-VN')}</td>
                                                    <td><strong>{r.productName}</strong></td>
                                                    <td><span className="badge badge-secondary">{r.categoryName}</span></td>
                                                    <td className="text-center">{fmt(r.quantity)}</td>
                                                    <td className="text-right">{fmtCur(r.unitCost)}</td>
                                                    <td className="text-right"><strong>{fmtCur(r.totalCost)}</strong></td>
                                                    <td>{r.supplier}</td>
                                                    <td>{r.notes}</td>
                                                    <td>
                                                        <button className="btn btn-xs btn-info mr-1" onClick={() => openRecModal(r)} title="Sửa">
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button className="btn btn-xs btn-danger" onClick={() => deleteReceipt(r.id)} title="Xóa">
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="card-footer d-flex justify-content-between align-items-center">
                                <span>Tổng: {recTotal} phiếu</span>
                                <Pagination page={recPage} totalPages={recTotalPages} onPage={setRecPage} />
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Hư hỏng ── */}
                    {activeTab === 'damaged' && (
                        <div className="card">
                            <div className="card-header">
                                <div className="row align-items-center">
                                    <div className="col-md-4">
                                        <h3 className="card-title mb-0">Hàng hư hỏng</h3>
                                    </div>
                                    <div className="col-md-5">
                                        <div className="input-group input-group-sm">
                                            <input type="date" className="form-control" value={dmgStartDate} onChange={e => { setDmgStartDate(e.target.value); setDmgPage(1); }} />
                                            <div className="input-group-prepend input-group-append">
                                                <span className="input-group-text">đến</span>
                                            </div>
                                            <input type="date" className="form-control" value={dmgEndDate} onChange={e => { setDmgEndDate(e.target.value); setDmgPage(1); }} />
                                        </div>
                                    </div>
                                    <div className="col-md-3 text-right">
                                        <button className="btn btn-warning btn-sm" onClick={openDmgModal}>
                                            <i className="fas fa-plus mr-1"></i>Ghi nhận hư hỏng
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="card-body p-0">
                                {dmgLoading ? (
                                    <div className="text-center py-5"><div className="spinner-border text-warning"></div></div>
                                ) : (
                                    <table className="table table-bordered table-striped mb-0">
                                        <thead className="thead-light">
                                            <tr>
                                                <th>Ngày báo cáo</th>
                                                <th>Sản phẩm</th>
                                                <th>Danh mục</th>
                                                <th className="text-center">SL hư</th>
                                                <th>Lý do</th>
                                                <th>Ghi chú</th>
                                                <th style={{ width: 70 }}>Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {damaged.length === 0 ? (
                                                <tr><td colSpan="7" className="text-center text-muted py-4">Chưa có bản ghi hư hỏng nào</td></tr>
                                            ) : damaged.map(d => (
                                                <tr key={d.id}>
                                                    <td>{new Date(d.reportedDate).toLocaleDateString('vi-VN')}</td>
                                                    <td><strong>{d.productName}</strong></td>
                                                    <td><span className="badge badge-secondary">{d.categoryName}</span></td>
                                                    <td className="text-center"><span className="text-danger font-weight-bold">{fmt(d.quantity)}</span></td>
                                                    <td>{d.reason}</td>
                                                    <td>{d.notes}</td>
                                                    <td>
                                                        <button className="btn btn-xs btn-danger" onClick={() => deleteDamaged(d.id)} title="Xóa">
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="card-footer d-flex justify-content-between align-items-center">
                                <span>Tổng: {dmgTotal} bản ghi</span>
                                <Pagination page={dmgPage} totalPages={dmgTotalPages} onPage={setDmgPage} />
                            </div>
                        </div>
                    )}

                    {/* ── TAB: Báo cáo & Xuất ── */}
                    {activeTab === 'report' && (
                        <div>
                            <div className="card">
                                <div className="card-header">
                                    <div className="row align-items-center">
                                        <div className="col-md-6">
                                            <div className="input-group input-group-sm">
                                                <div className="input-group-prepend">
                                                    <span className="input-group-text">Từ</span>
                                                </div>
                                                <input type="date" className="form-control" value={rptStart} onChange={e => setRptStart(e.target.value)} />
                                                <div className="input-group-prepend input-group-append">
                                                    <span className="input-group-text">đến</span>
                                                </div>
                                                <input type="date" className="form-control" value={rptEnd} onChange={e => setRptEnd(e.target.value)} />
                                                <div className="input-group-append">
                                                    <button className="btn btn-primary btn-sm" onClick={loadReport}>
                                                        <i className="fas fa-search mr-1"></i>Xem báo cáo
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6 text-right">
                                            <button className="btn btn-success btn-sm" onClick={exportReport} disabled={!report}>
                                                <i className="fas fa-file-csv mr-1"></i>Xuất CSV
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="card-body">
                                    {rptLoading ? (
                                        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                                    ) : report ? (
                                        <>
                                            {/* Summary boxes */}
                                            <div className="row mb-4">
                                                <div className="col-md-2 col-sm-4">
                                                    <div className="small-box bg-info">
                                                        <div className="inner">
                                                            <h4>{fmt(report.summary.totalReceived)}</h4>
                                                            <p>Tổng nhập</p>
                                                        </div>
                                                        <div className="icon"><i className="fas fa-truck-loading"></i></div>
                                                    </div>
                                                </div>
                                                <div className="col-md-2 col-sm-4">
                                                    <div className="small-box bg-success">
                                                        <div className="inner">
                                                            <h4>{fmt(report.summary.totalSold)}</h4>
                                                            <p>Tổng bán</p>
                                                        </div>
                                                        <div className="icon"><i className="fas fa-shopping-cart"></i></div>
                                                    </div>
                                                </div>
                                                <div className="col-md-2 col-sm-4">
                                                    <div className="small-box bg-danger">
                                                        <div className="inner">
                                                            <h4>{fmt(report.summary.totalDamaged)}</h4>
                                                            <p>Hư hỏng</p>
                                                        </div>
                                                        <div className="icon"><i className="fas fa-exclamation-triangle"></i></div>
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-sm-6">
                                                    <div className="small-box bg-warning">
                                                        <div className="inner">
                                                            <h4 style={{ fontSize: '1.2rem' }}>{fmtCur(report.summary.totalRevenue)}</h4>
                                                            <p>Doanh thu bán</p>
                                                        </div>
                                                        <div className="icon"><i className="fas fa-coins"></i></div>
                                                    </div>
                                                </div>
                                                <div className="col-md-3 col-sm-6">
                                                    <div className="small-box bg-secondary">
                                                        <div className="inner">
                                                            <h4 style={{ fontSize: '1.2rem' }}>{fmtCur(report.summary.totalCost)}</h4>
                                                            <p>Chi phí nhập</p>
                                                        </div>
                                                        <div className="icon"><i className="fas fa-receipt"></i></div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Detail table */}
                                            <table className="table table-bordered table-sm table-striped">
                                                <thead className="thead-dark">
                                                    <tr>
                                                        <th>Sản phẩm</th>
                                                        <th>Danh mục</th>
                                                        <th className="text-center">Tồn hiện tại</th>
                                                        <th className="text-center">SL Nhập</th>
                                                        <th className="text-right">Chi phí nhập</th>
                                                        <th className="text-center">SL Bán</th>
                                                        <th className="text-right">Doanh thu</th>
                                                        <th className="text-center">SL Hư</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(report.details || []).length === 0 ? (
                                                        <tr><td colSpan="8" className="text-center text-muted py-4">Không có dữ liệu trong khoảng thời gian này</td></tr>
                                                    ) : (report.details || []).map((d, i) => (
                                                        <tr key={i}>
                                                            <td>{d.productName}</td>
                                                            <td><span className="badge badge-secondary">{d.categoryName}</span></td>
                                                            <td className="text-center">{fmt(d.currentStock)}</td>
                                                            <td className="text-center text-info">{fmt(d.quantityReceived)}</td>
                                                            <td className="text-right">{fmtCur(d.totalCostReceived)}</td>
                                                            <td className="text-center text-success">{fmt(d.quantitySold)}</td>
                                                            <td className="text-right text-success"><strong>{fmtCur(d.revenue)}</strong></td>
                                                            <td className="text-center text-danger">{fmt(d.quantityDamaged)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="thead-light">
                                                    <tr>
                                                        <td colSpan="3"><strong>Tổng cộng</strong></td>
                                                        <td className="text-center text-info"><strong>{fmt(report.summary.totalReceived)}</strong></td>
                                                        <td className="text-right"><strong>{fmtCur(report.summary.totalCost)}</strong></td>
                                                        <td className="text-center text-success"><strong>{fmt(report.summary.totalSold)}</strong></td>
                                                        <td className="text-right text-success"><strong>{fmtCur(report.summary.totalRevenue)}</strong></td>
                                                        <td className="text-center text-danger"><strong>{fmt(report.summary.totalDamaged)}</strong></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </>
                                    ) : (
                                        <div className="text-center text-muted py-5">
                                            <i className="fas fa-chart-bar fa-3x mb-3 d-block"></i>
                                            Chọn khoảng thời gian và nhấn "Xem báo cáo"
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* ── Modal: Nhập kho ── */}
            {showRecModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="fas fa-truck-loading mr-2"></i>
                                        {editReceipt ? 'Sửa phiếu nhập' : 'Nhập hàng vào kho'}
                                    </h5>
                                    <button className="close" onClick={() => setShowRecModal(false)}><span>&times;</span></button>
                                </div>
                                <form onSubmit={submitReceipt}>
                                    <div className="modal-body">
                                        {recError && <div className="alert alert-danger">{recError}</div>}
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Sản phẩm <span className="text-danger">*</span></label>
                                                    <select className="form-control" required
                                                        value={recForm.productId}
                                                        onChange={e => setRecForm({ ...recForm, productId: e.target.value })}>
                                                        <option value="">-- Chọn sản phẩm --</option>
                                                        {products.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="form-group">
                                                    <label>Số lượng <span className="text-danger">*</span></label>
                                                    <input type="number" className="form-control" min="1" required
                                                        value={recForm.quantity} onChange={e => setRecForm({ ...recForm, quantity: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="form-group">
                                                    <label>Đơn giá nhập (VNĐ)</label>
                                                    <input type="number" className="form-control" min="0" step="100"
                                                        value={recForm.unitCost} onChange={e => setRecForm({ ...recForm, unitCost: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Nhà cung cấp</label>
                                                    <input type="text" className="form-control" placeholder="Tên nhà cung cấp..."
                                                        value={recForm.supplier} onChange={e => setRecForm({ ...recForm, supplier: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="form-group">
                                                    <label>Ngày nhập</label>
                                                    <input type="date" className="form-control"
                                                        value={recForm.receivedDate} onChange={e => setRecForm({ ...recForm, receivedDate: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="form-group">
                                                    <label>Thành tiền</label>
                                                    <input type="text" className="form-control" disabled
                                                        value={fmtCur((recForm.quantity || 0) * (recForm.unitCost || 0))} />
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <div className="form-group">
                                                    <label>Ghi chú</label>
                                                    <textarea className="form-control" rows="2"
                                                        value={recForm.notes} onChange={e => setRecForm({ ...recForm, notes: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowRecModal(false)}>Hủy</button>
                                        <button type="submit" className="btn btn-primary">
                                            <i className="fas fa-save mr-1"></i>
                                            {editReceipt ? 'Cập nhật' : 'Xác nhận nhập kho'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}

            {/* ── Modal: Hư hỏng ── */}
            {showDmgModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        <i className="fas fa-exclamation-triangle mr-2 text-warning"></i>
                                        Ghi nhận hàng hư hỏng
                                    </h5>
                                    <button className="close" onClick={() => setShowDmgModal(false)}><span>&times;</span></button>
                                </div>
                                <form onSubmit={submitDamaged}>
                                    <div className="modal-body">
                                        {dmgError && <div className="alert alert-danger">{dmgError}</div>}
                                        <div className="alert alert-warning py-2">
                                            <i className="fas fa-info-circle mr-1"></i>
                                            Tồn kho của sản phẩm sẽ bị giảm theo số lượng hư hỏng.
                                        </div>
                                        <div className="form-group">
                                            <label>Sản phẩm <span className="text-danger">*</span></label>
                                            <select className="form-control" required
                                                value={dmgForm.productId} onChange={e => setDmgForm({ ...dmgForm, productId: e.target.value })}>
                                                <option value="">-- Chọn sản phẩm --</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Số lượng hư <span className="text-danger">*</span></label>
                                                    <input type="number" className="form-control" min="1" required
                                                        value={dmgForm.quantity} onChange={e => setDmgForm({ ...dmgForm, quantity: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Ngày báo cáo</label>
                                                    <input type="date" className="form-control"
                                                        value={dmgForm.reportedDate} onChange={e => setDmgForm({ ...dmgForm, reportedDate: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Lý do hư hỏng</label>
                                            <input type="text" className="form-control" placeholder="Vỡ, ẩm mốc, hết hạn..."
                                                value={dmgForm.reason} onChange={e => setDmgForm({ ...dmgForm, reason: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Ghi chú</label>
                                            <textarea className="form-control" rows="2"
                                                value={dmgForm.notes} onChange={e => setDmgForm({ ...dmgForm, notes: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowDmgModal(false)}>Hủy</button>
                                        <button type="submit" className="btn btn-warning">
                                            <i className="fas fa-save mr-1"></i>Ghi nhận
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    );
}
