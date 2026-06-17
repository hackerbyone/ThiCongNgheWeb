/**
 * Warehouse portal sub-pages: WStock, WReceipts, WDamaged, WReport
 * Each exported as a named component for use as a separate route.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { warehouseApi, productApi, categoryApi } from '../../services/api'

const fmt    = (n) => new Intl.NumberFormat('vi-VN').format(n || 0)
const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

const exportCSV = (rows, filename) => {
    const bom = '﻿'
    const csv = bom + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
}

const Pager = ({ page, totalPages, onPage }) => (
    <ul className="pagination mb-0">
        <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPage(page - 1)}>‹</button>
        </li>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
            <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                <button className="page-link" onClick={() => onPage(p)}>{p}</button>
            </li>
        ))}
        <li className={`page-item ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPage(page + 1)}>›</button>
        </li>
    </ul>
)

// ── WStock ─────────────────────────────────────────────────────────────
export function WStock() {
    const [inventory, setInventory] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const r = await productApi.getAll({ pageSize: 999 })
            setInventory(r.data.items || [])
        }
        catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const filtered = inventory.filter(i =>
        !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
        (i.categoryName || '').toLowerCase().includes(search.toLowerCase())
    )

    const doExport = () => exportCSV([
        ['Tồn kho - ' + new Date().toLocaleDateString('vi-VN')],
        [],
        ['Sản phẩm', 'Danh mục', 'Giá bán', 'Tồn kho', 'Trạng thái'],
        ...filtered.map(i => [i.name, i.categoryName, i.price, i.stock, i.stock === 0 ? 'Hết hàng' : i.stock <= 10 ? 'Sắp hết' : 'Còn hàng'])
    ], `ton-kho-${new Date().toISOString().split('T')[0]}.csv`)

    return (
        <div className="content-wrapper">
            <div className="content-header"><div className="container-fluid">
                <h1 className="m-0"><i className="fas fa-boxes mr-2"></i>Tồn kho hiện tại</h1>
            </div></div>
            <section className="content"><div className="container-fluid">
                <div className="card">
                    <div className="card-header">
                        <div className="row align-items-center">
                            <div className="col-md-5"><input className="form-control form-control-sm" placeholder="Tìm sản phẩm, danh mục..." value={search} onChange={e => setSearch(e.target.value)} /></div>
                            <div className="col-md-7 text-right">
                                <button className="btn btn-sm btn-success mr-1" onClick={load}><i className="fas fa-sync mr-1"></i>Làm mới</button>
                                <button className="btn btn-sm btn-info" onClick={doExport}><i className="fas fa-file-csv mr-1"></i>Xuất CSV</button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
                            <table className="table table-bordered table-striped table-hover mb-0">
                                <thead className="thead-dark">
                                    <tr>
                                        <th>Sản phẩm</th>
                                        <th>Danh mục</th>
                                        <th className="text-right">Giá bán</th>
                                        <th className="text-center">Tồn kho</th>
                                        <th className="text-center">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0
                                        ? <tr><td colSpan="5" className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                                        : filtered.map(i => (
                                            <tr key={i.id}>
                                                <td><strong>{i.name}</strong></td>
                                                <td><span className="badge badge-secondary">{i.categoryName}</span></td>
                                                <td className="text-right">{fmtCur(i.price)}</td>
                                                <td className="text-center">
                                                    <strong className={i.stock === 0 ? 'text-danger' : i.stock <= 10 ? 'text-warning' : 'text-success'}>
                                                        {fmt(i.stock)}
                                                    </strong>
                                                </td>
                                                <td className="text-center">
                                                    {i.stock === 0
                                                        ? <span className="badge badge-danger">Hết hàng</span>
                                                        : i.stock <= 10
                                                        ? <span className="badge badge-warning">Sắp hết</span>
                                                        : <span className="badge badge-success">Còn hàng</span>}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="card-footer text-muted">
                        Tổng {filtered.length} sản phẩm · Hết hàng: {filtered.filter(i => i.stock === 0).length} · Sắp hết: {filtered.filter(i => i.stock > 0 && i.stock <= 10).length}
                    </div>
                </div>
            </div></section>
        </div>
    )
}

// ── WReceipts ──────────────────────────────────────────────────────────
export function WReceipts() {
    const [receipts, setReceipts] = useState([])
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [catFilter, setCatFilter] = useState('')
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(0); const [total, setTotal] = useState(0)
    const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('')
    const [showModal, setShowModal] = useState(false); const [editing, setEditing] = useState(null)
    const [mode, setMode] = useState('existing') // 'existing' | 'new'
    const [form, setForm] = useState({ productId: '', quantity: 1, unitCost: 0, supplier: '', receivedDate: new Date().toISOString().split('T')[0], notes: '' })
    const [newProd, setNewProd] = useState({ name: '', categoryId: '', price: 0, description: '' })
    const [error, setError] = useState('')

    const reloadProducts = () => productApi.getAll({ pageSize: 999 }).then(r => setProducts(r.data.items || [])).catch(() => {})

    useEffect(() => {
        reloadProducts()
        categoryApi.getAll().then(r => setCategories(r.data || [])).catch(() => {})
    }, [])
    useEffect(() => { load() }, [page, startDate, endDate])

    const load = async () => {
        setLoading(true)
        try {
            const p = { page, pageSize: 12 }
            if (startDate) p.startDate = startDate
            if (endDate) p.endDate = endDate
            const r = await warehouseApi.getReceipts(p)
            setReceipts(r.data.items || []); setTotalPages(r.data.totalPages || 0); setTotal(r.data.totalCount || 0)
        } catch { } finally { setLoading(false) }
    }

    const openModal = (rec = null) => {
        if (rec) {
            setEditing(rec)
            setMode('existing')
            setForm({ productId: rec.productId, quantity: rec.quantity, unitCost: rec.unitCost, supplier: rec.supplier || '', receivedDate: rec.receivedDate?.split('T')[0] || '', notes: rec.notes || '' })
            const prod = products.find(p => p.id === rec.productId)
            setCatFilter(prod?.categoryId ? String(prod.categoryId) : '')
        } else {
            setEditing(null)
            setMode('existing')
            setForm({ productId: '', quantity: 1, unitCost: 0, supplier: '', receivedDate: new Date().toISOString().split('T')[0], notes: '' })
            setNewProd({ name: '', categoryId: '', price: 0, description: '' })
            setCatFilter('')
        }
        setError(''); setShowModal(true)
    }

    const switchMode = (m) => {
        setMode(m)
        setError('')
        setForm(f => ({ ...f, productId: '' }))
        setNewProd({ name: '', categoryId: '', price: 0, description: '' })
        setCatFilter('')
    }

    const submit = async (e) => {
        e.preventDefault(); setError('')
        try {
            let productId = parseInt(form.productId)
            if (mode === 'new') {
                if (!newProd.name.trim()) { setError('Vui lòng nhập tên sản phẩm mới'); return }
                if (!newProd.categoryId) { setError('Vui lòng chọn danh mục cho sản phẩm mới'); return }
                const res = await warehouseApi.createProduct({
                    name: newProd.name.trim(),
                    categoryId: parseInt(newProd.categoryId),
                    price: parseFloat(newProd.price) || 0,
                    stock: 0,
                    description: newProd.description || ''
                })
                productId = res.data.id
                reloadProducts()
            }
            const payload = { ...form, productId, quantity: parseInt(form.quantity), unitCost: parseFloat(form.unitCost) }
            if (editing) await warehouseApi.updateReceipt(editing.id, payload)
            else await warehouseApi.createReceipt(payload)
            setShowModal(false); load()
        } catch (err) { setError(err.response?.data?.message || 'Thao tác thất bại') }
    }

    const del = async (id) => {
        if (!window.confirm('Xóa phiếu nhập? Tồn kho sẽ được hoàn lại và commit sẽ được ghi.')) return
        try { await warehouseApi.deleteReceipt(id); load() } catch (err) { alert(err.response?.data?.message || 'Xóa thất bại') }
    }

    const filteredProducts = catFilter ? products.filter(p => String(p.categoryId) === catFilter) : products

    return (
        <div className="content-wrapper">
            <div className="content-header"><div className="container-fluid">
                <h1 className="m-0"><i className="fas fa-truck-loading mr-2"></i>Nhập kho</h1>
            </div></div>
            <section className="content"><div className="container-fluid">
                <div className="alert alert-info py-2 mb-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    Mỗi lần nhập kho sẽ <strong>cộng tồn kho</strong> và tự động <strong>tạo commit</strong> trong lịch sử giao dịch.
                </div>
                <div className="card">
                    <div className="card-header">
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <div className="input-group input-group-sm">
                                    <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} />
                                    <div className="input-group-prepend input-group-append"><span className="input-group-text">đến</span></div>
                                    <input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} />
                                </div>
                            </div>
                            <div className="col-md-6 text-right">
                                <button className="btn btn-success btn-sm" onClick={() => openModal()}><i className="fas fa-plus mr-1"></i>Tạo phiếu nhập</button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
                            <table className="table table-bordered table-striped mb-0">
                                <thead className="thead-dark">
                                    <tr>
                                        <th>Ngày nhập</th><th>Sản phẩm</th><th>Danh mục</th>
                                        <th className="text-center">SL</th><th className="text-right">Đơn giá</th>
                                        <th className="text-right">Thành tiền</th><th>NCC</th><th>Ghi chú</th>
                                        <th style={{ width: 90 }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receipts.length === 0 ? <tr><td colSpan="9" className="text-center py-4 text-muted">Chưa có phiếu nhập nào</td></tr>
                                        : receipts.map(r => (
                                            <tr key={r.id}>
                                                <td>{new Date(r.receivedDate).toLocaleDateString('vi-VN')}</td>
                                                <td><strong>{r.productName}</strong></td>
                                                <td><span className="badge badge-secondary">{r.categoryName}</span></td>
                                                <td className="text-center font-weight-bold text-info">{fmt(r.quantity)}</td>
                                                <td className="text-right">{fmtCur(r.unitCost)}</td>
                                                <td className="text-right"><strong>{fmtCur(r.totalCost)}</strong></td>
                                                <td>{r.supplier}</td><td className="small text-muted">{r.notes}</td>
                                                <td>
                                                    <button className="btn btn-xs btn-info mr-1" onClick={() => openModal(r)}><i className="fas fa-edit"></i></button>
                                                    <button className="btn btn-xs btn-danger" onClick={() => del(r.id)}><i className="fas fa-trash"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="card-footer d-flex justify-content-between align-items-center">
                        <span>Tổng: {total} phiếu</span>
                        <Pager page={page} totalPages={totalPages} onPage={setPage} />
                    </div>
                </div>
            </div></section>

            {showModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title"><i className="fas fa-truck-loading mr-2"></i>{editing ? 'Sửa phiếu nhập' : 'Tạo phiếu nhập kho'}</h5>
                                    <button className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
                                </div>
                                <form onSubmit={submit}>
                                    <div className="modal-body">
                                        {error && <div className="alert alert-danger py-2">{error}</div>}

                                        {/* Toggle chế độ chọn sản phẩm — chỉ hiện khi tạo mới */}
                                        {!editing && (
                                            <div className="btn-group btn-group-sm w-100 mb-3" role="group">
                                                <button type="button"
                                                    className={`btn ${mode === 'existing' ? 'btn-primary' : 'btn-outline-primary'}`}
                                                    onClick={() => switchMode('existing')}>
                                                    <i className="fas fa-search mr-1"></i>Chọn sản phẩm có sẵn
                                                </button>
                                                <button type="button"
                                                    className={`btn ${mode === 'new' ? 'btn-success' : 'btn-outline-success'}`}
                                                    onClick={() => switchMode('new')}>
                                                    <i className="fas fa-plus-circle mr-1"></i>Nhập sản phẩm mới
                                                </button>
                                            </div>
                                        )}

                                        <div className="row">
                                            {mode === 'existing' ? (
                                                <>
                                                    <div className="col-md-6">
                                                        <div className="form-group">
                                                            <label>Danh mục</label>
                                                            <select className="form-control" value={catFilter} onChange={e => { setCatFilter(e.target.value); setForm(f => ({ ...f, productId: '' })) }}>
                                                                <option value="">-- Tất cả danh mục --</option>
                                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="form-group">
                                                            <label>Sản phẩm <span className="text-danger">*</span></label>
                                                            <select className="form-control" required value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}>
                                                                <option value="">-- Chọn sản phẩm --</option>
                                                                {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock})</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="col-12">
                                                        <div className="alert alert-success py-2">
                                                            <i className="fas fa-info-circle mr-1"></i>
                                                            Sản phẩm mới sẽ được <strong>tự động tạo</strong> vào hệ thống, sau đó nhập kho với số lượng bên dưới.
                                                        </div>
                                                    </div>
                                                    <div className="col-md-8">
                                                        <div className="form-group">
                                                            <label>Tên sản phẩm mới <span className="text-danger">*</span></label>
                                                            <input className="form-control" placeholder="VD: Bút bi Thiên Long 026..." value={newProd.name} onChange={e => setNewProd({ ...newProd, name: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div className="col-md-4">
                                                        <div className="form-group">
                                                            <label>Giá bán (₫)</label>
                                                            <input type="number" className="form-control" min="0" step="100" value={newProd.price} onChange={e => setNewProd({ ...newProd, price: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="form-group">
                                                            <label>Danh mục <span className="text-danger">*</span></label>
                                                            <select className="form-control" value={newProd.categoryId} onChange={e => setNewProd({ ...newProd, categoryId: e.target.value })}>
                                                                <option value="">-- Chọn danh mục --</option>
                                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="form-group">
                                                            <label>Mô tả ngắn</label>
                                                            <input className="form-control" placeholder="Không bắt buộc" value={newProd.description} onChange={e => setNewProd({ ...newProd, description: e.target.value })} />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            <div className="col-12"><hr className="my-1" /></div>

                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label>Số lượng nhập <span className="text-danger">*</span></label>
                                                    <input type="number" className="form-control" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label>Đơn giá nhập</label>
                                                    <input type="number" className="form-control" min="0" step="100" value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label>Thành tiền</label>
                                                    <input className="form-control" disabled value={fmtCur((form.quantity || 0) * (form.unitCost || 0))} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Nhà cung cấp</label>
                                                    <input className="form-control" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Ngày nhập</label>
                                                    <input type="date" className="form-control" value={form.receivedDate} onChange={e => setForm({ ...form, receivedDate: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <div className="form-group">
                                                    <label>Ghi chú (commit message)</label>
                                                    <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                        <button type="submit" className="btn btn-success">
                                            <i className="fas fa-save mr-1"></i>
                                            {editing ? 'Cập nhật' : mode === 'new' ? 'Tạo sản phẩm & Nhập kho' : 'Xác nhận nhập kho'}
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
    )
}

// ── WDamaged ───────────────────────────────────────────────────────────
export function WDamaged() {
    const [damaged, setDamaged] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(0); const [total, setTotal] = useState(0)
    const [startDate, setStartDate] = useState(''); const [endDate, setEndDate] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState({ productId: '', quantity: 1, reason: '', reportedDate: new Date().toISOString().split('T')[0], notes: '' })
    const [error, setError] = useState('')

    useEffect(() => { productApi.getAll({ pageSize: 999 }).then(r => setProducts(r.data.items || [])).catch(() => {}) }, [])
    useEffect(() => { load() }, [page, startDate, endDate])

    const load = async () => {
        setLoading(true)
        try {
            const p = { page, pageSize: 12 }
            if (startDate) p.startDate = startDate
            if (endDate) p.endDate = endDate
            const r = await warehouseApi.getDamaged(p)
            setDamaged(r.data.items || []); setTotalPages(r.data.totalPages || 0); setTotal(r.data.totalCount || 0)
        } catch { } finally { setLoading(false) }
    }

    const submit = async (e) => {
        e.preventDefault(); setError('')
        try {
            await warehouseApi.createDamaged({ ...form, productId: parseInt(form.productId), quantity: parseInt(form.quantity) })
            setShowModal(false); load()
        } catch (err) { setError(err.response?.data?.message || 'Thao tác thất bại') }
    }

    const del = async (id) => {
        if (!window.confirm('Xóa bản ghi? Tồn kho sẽ được hoàn lại và commit sẽ được ghi.')) return
        try { await warehouseApi.deleteDamaged(id); load() } catch (err) { alert(err.response?.data?.message || 'Xóa thất bại') }
    }

    return (
        <div className="content-wrapper">
            <div className="content-header"><div className="container-fluid">
                <h1 className="m-0"><i className="fas fa-exclamation-triangle mr-2 text-danger"></i>Hàng hư hỏng</h1>
            </div></div>
            <section className="content"><div className="container-fluid">
                <div className="alert alert-warning py-2 mb-3">
                    <i className="fas fa-info-circle mr-1"></i>
                    Ghi nhận hư hỏng sẽ <strong>trừ tồn kho</strong> và <strong>tạo commit</strong> trong lịch sử giao dịch.
                </div>
                <div className="card">
                    <div className="card-header">
                        <div className="row align-items-center">
                            <div className="col-md-6">
                                <div className="input-group input-group-sm">
                                    <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} />
                                    <div className="input-group-prepend input-group-append"><span className="input-group-text">đến</span></div>
                                    <input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} />
                                </div>
                            </div>
                            <div className="col-md-6 text-right">
                                <button className="btn btn-warning btn-sm" onClick={() => { setForm({ productId: '', quantity: 1, reason: '', reportedDate: new Date().toISOString().split('T')[0], notes: '' }); setError(''); setShowModal(true) }}>
                                    <i className="fas fa-plus mr-1"></i>Ghi nhận hư hỏng
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body p-0">
                        {loading ? <div className="text-center py-5"><div className="spinner-border text-warning"></div></div> : (
                            <table className="table table-bordered table-striped mb-0">
                                <thead className="thead-dark">
                                    <tr>
                                        <th>Ngày báo cáo</th><th>Sản phẩm</th><th>Danh mục</th>
                                        <th className="text-center">SL hư</th><th>Lý do</th><th>Ghi chú</th>
                                        <th style={{ width: 70 }}>Xóa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {damaged.length === 0 ? <tr><td colSpan="7" className="text-center py-4 text-muted">Chưa có bản ghi hư hỏng</td></tr>
                                        : damaged.map(d => (
                                            <tr key={d.id}>
                                                <td>{new Date(d.reportedDate).toLocaleDateString('vi-VN')}</td>
                                                <td><strong>{d.productName}</strong></td>
                                                <td><span className="badge badge-secondary">{d.categoryName}</span></td>
                                                <td className="text-center"><span className="badge badge-danger font-weight-bold">{fmt(d.quantity)}</span></td>
                                                <td>{d.reason}</td><td className="small text-muted">{d.notes}</td>
                                                <td><button className="btn btn-xs btn-danger" onClick={() => del(d.id)}><i className="fas fa-trash"></i></button></td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="card-footer d-flex justify-content-between align-items-center">
                        <span>Tổng: {total} bản ghi</span>
                        <Pager page={page} totalPages={totalPages} onPage={setPage} />
                    </div>
                </div>
            </div></section>

            {showModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title"><i className="fas fa-exclamation-triangle mr-2 text-warning"></i>Ghi nhận hàng hư hỏng</h5>
                                    <button className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
                                </div>
                                <form onSubmit={submit}>
                                    <div className="modal-body">
                                        {error && <div className="alert alert-danger">{error}</div>}
                                        <div className="alert alert-warning py-2"><i className="fas fa-info-circle mr-1"></i>Tồn kho sẽ bị <strong>trừ</strong> theo số lượng hư hỏng.</div>
                                        <div className="form-group">
                                            <label>Sản phẩm <span className="text-danger">*</span></label>
                                            <select className="form-control" required value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}>
                                                <option value="">-- Chọn sản phẩm --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Tồn: {p.stock})</option>)}
                                            </select>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Số lượng hư <span className="text-danger">*</span></label>
                                                    <input type="number" className="form-control" min="1" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Ngày báo cáo</label>
                                                    <input type="date" className="form-control" value={form.reportedDate} onChange={e => setForm({ ...form, reportedDate: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label>Lý do hư hỏng</label>
                                            <input className="form-control" placeholder="Vỡ, ẩm mốc, hết hạn..." value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Ghi chú (commit message)</label>
                                            <textarea className="form-control" rows="2" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                        <button type="submit" className="btn btn-warning"><i className="fas fa-save mr-1"></i>Ghi nhận</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    )
}

// ── WCategories ────────────────────────────────────────────────────────
export function WCategories() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ name: '', description: '' })
    const [error, setError] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        try { const r = await categoryApi.getAll(); setCategories(r.data || []) }
        catch { } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const openModal = (cat = null) => {
        if (cat) { setEditing(cat); setForm({ name: cat.name, description: cat.description || '' }) }
        else { setEditing(null); setForm({ name: '', description: '' }) }
        setError(''); setShowModal(true)
    }

    const submit = async (e) => {
        e.preventDefault(); setError('')
        try {
            if (editing) await categoryApi.update(editing.id, form)
            else await categoryApi.create(form)
            setShowModal(false); load()
        } catch (err) { setError(err.response?.data?.message || 'Thao tác thất bại') }
    }

    const del = async (cat) => {
        if (!window.confirm(`Xóa danh mục "${cat.name}"?`)) return
        try { await categoryApi.delete(cat.id); load() }
        catch (err) { alert(err.response?.data?.message || 'Xóa thất bại') }
    }

    return (
        <div className="content-wrapper">
            <div className="content-header"><div className="container-fluid">
                <h1 className="m-0"><i className="fas fa-tags mr-2"></i>Danh mục sản phẩm</h1>
            </div></div>
            <section className="content"><div className="container-fluid">
                <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <span className="font-weight-bold">Danh sách danh mục</span>
                        <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                            <i className="fas fa-plus mr-1"></i>Thêm danh mục
                        </button>
                    </div>
                    <div className="card-body p-0">
                        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div> : (
                            <table className="table table-bordered table-striped table-hover mb-0">
                                <thead className="thead-dark">
                                    <tr>
                                        <th style={{ width: 60 }}>#</th>
                                        <th>Tên danh mục</th>
                                        <th>Mô tả</th>
                                        <th style={{ width: 120 }}>Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.length === 0
                                        ? <tr><td colSpan="4" className="text-center py-4 text-muted">Chưa có danh mục nào</td></tr>
                                        : categories.map((cat, i) => (
                                            <tr key={cat.id}>
                                                <td>{i + 1}</td>
                                                <td><strong>{cat.name}</strong></td>
                                                <td className="text-muted">{cat.description}</td>
                                                <td>
                                                    <button className="btn btn-xs btn-info mr-1" onClick={() => openModal(cat)}><i className="fas fa-edit"></i></button>
                                                    <button className="btn btn-xs btn-danger" onClick={() => del(cat)}><i className="fas fa-trash"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="card-footer text-muted">Tổng: {categories.length} danh mục</div>
                </div>
            </div></section>

            {showModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title"><i className="fas fa-tags mr-2"></i>{editing ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h5>
                                    <button className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
                                </div>
                                <form onSubmit={submit}>
                                    <div className="modal-body">
                                        {error && <div className="alert alert-danger">{error}</div>}
                                        <div className="form-group">
                                            <label>Tên danh mục <span className="text-danger">*</span></label>
                                            <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Bút viết, Giấy in..." />
                                        </div>
                                        <div className="form-group">
                                            <label>Mô tả</label>
                                            <textarea className="form-control" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả danh mục..." />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                        <button type="submit" className="btn btn-primary"><i className="fas fa-save mr-1"></i>{editing ? 'Cập nhật' : 'Thêm mới'}</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <div className="modal-backdrop fade show"></div>
                </>
            )}
        </div>
    )
}

// ── WReport ────────────────────────────────────────────────────────────
const getDefaults = () => {
    const now = new Date()
    return {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        end:   now.toISOString().split('T')[0]
    }
}

export function WReport() {
    const def = getDefaults()
    const [rptStart, setRptStart] = useState(def.start)
    const [rptEnd,   setRptEnd]   = useState(def.end)
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(false)

    const load = async () => {
        setLoading(true)
        try { const r = await warehouseApi.getReport({ startDate: rptStart, endDate: rptEnd }); setReport(r.data) }
        catch { } finally { setLoading(false) }
    }

    const doExport = () => {
        if (!report) return
        const { summary, details } = report
        exportCSV([
            [`Báo cáo kho hàng: ${rptStart} đến ${rptEnd}`],
            [],
            ['Tổng nhập', 'Tổng bán', 'Tổng hư hỏng', 'Doanh thu', 'Chi phí nhập'],
            [summary.totalReceived, summary.totalSold, summary.totalDamaged, summary.totalRevenue, summary.totalCost],
            [],
            ['Sản phẩm', 'Danh mục', 'Tồn hiện tại', 'SL Nhập', 'Chi phí nhập', 'SL Bán', 'Doanh thu', 'SL Hư'],
            ...(details || []).map(d => [d.productName, d.categoryName, d.currentStock, d.quantityReceived, d.totalCostReceived, d.quantitySold, d.revenue, d.quantityDamaged])
        ], `bao-cao-kho-${rptStart}-${rptEnd}.csv`)
    }

    return (
        <div className="content-wrapper">
            <div className="content-header"><div className="container-fluid">
                <h1 className="m-0"><i className="fas fa-chart-bar mr-2"></i>Báo cáo & Xuất file</h1>
            </div></div>
            <section className="content"><div className="container-fluid">
                <div className="card">
                    <div className="card-header">
                        <div className="row align-items-center">
                            <div className="col-md-7">
                                <div className="input-group input-group-sm">
                                    <div className="input-group-prepend"><span className="input-group-text">Từ</span></div>
                                    <input type="date" className="form-control" value={rptStart} onChange={e => setRptStart(e.target.value)} />
                                    <div className="input-group-prepend input-group-append"><span className="input-group-text">đến</span></div>
                                    <input type="date" className="form-control" value={rptEnd} onChange={e => setRptEnd(e.target.value)} />
                                    <div className="input-group-append">
                                        <button className="btn btn-primary btn-sm" onClick={load}><i className="fas fa-search mr-1"></i>Xem báo cáo</button>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-5 text-right">
                                <button className="btn btn-success btn-sm" onClick={doExport} disabled={!report}>
                                    <i className="fas fa-file-csv mr-1"></i>Xuất CSV
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="card-body">
                        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            : report ? (
                                <>
                                    <div className="row mb-4">
                                        {[
                                            { bg: 'info',      val: fmt(report.summary.totalReceived),       label: 'Tổng nhập',    icon: 'fa-truck-loading' },
                                            { bg: 'success',   val: fmt(report.summary.totalSold),           label: 'Tổng bán',     icon: 'fa-shopping-cart' },
                                            { bg: 'danger',    val: fmt(report.summary.totalDamaged),        label: 'Hư hỏng',      icon: 'fa-exclamation-triangle' },
                                            { bg: 'warning',   val: fmtCur(report.summary.totalRevenue),    label: 'Doanh thu',    icon: 'fa-coins', small: true },
                                            { bg: 'secondary', val: fmtCur(report.summary.totalCost),       label: 'Chi phí nhập', icon: 'fa-receipt', small: true },
                                        ].map((s, i) => (
                                            <div key={i} className="col-md-2 col-sm-4 col-6 mb-3">
                                                <div className={`small-box bg-${s.bg}`}>
                                                    <div className="inner">
                                                        <h4 style={s.small ? { fontSize: '1rem' } : {}}>{s.val}</h4>
                                                        <p>{s.label}</p>
                                                    </div>
                                                    <div className="icon"><i className={`fas ${s.icon}`}></i></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <table className="table table-bordered table-sm table-striped">
                                        <thead className="thead-dark">
                                            <tr>
                                                <th>Sản phẩm</th><th>Danh mục</th>
                                                <th className="text-center">Tồn hiện tại</th>
                                                <th className="text-center">SL Nhập</th><th className="text-right">Chi phí nhập</th>
                                                <th className="text-center">SL Bán</th><th className="text-right">Doanh thu</th>
                                                <th className="text-center">SL Hư</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(report.details || []).length === 0
                                                ? <tr><td colSpan="8" className="text-center text-muted py-4">Không có dữ liệu trong khoảng thời gian này</td></tr>
                                                : (report.details || []).map((d, i) => (
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
                                    <i className="fas fa-chart-bar fa-3x mb-3 d-block opacity-50"></i>
                                    Chọn khoảng thời gian và nhấn "Xem báo cáo"
                                </div>
                            )}
                    </div>
                </div>
            </div></section>
        </div>
    )
}
