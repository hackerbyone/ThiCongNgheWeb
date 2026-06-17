import React, { useState, useEffect, useRef } from 'react'
import { warehouseApi, productApi, categoryApi, manufacturerApi } from '../../services/api'

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0)

export default function WarehouseProducts() {
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [manufacturers, setManufacturers] = useState([])
    const [loading, setLoading] = useState(true)
    const [keyword, setKeyword] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ name: '', price: 0, stock: 0, categoryId: '', manufacturerId: '', description: '', imageUrl: '', discountPercent: 0, stockNote: '' })
    const [imgMode, setImgMode] = useState('url')
    const [imgPreview, setImgPreview] = useState('')
    const [pendingFile, setPendingFile] = useState(null)
    const fileInputRef = useRef(null)
    const [error, setError] = useState('')

    useEffect(() => {
        categoryApi.getAll().then(r => setCategories(r.data || [])).catch(() => {})
        manufacturerApi.getAll().then(r => setManufacturers(r.data || [])).catch(() => {})
    }, [])

    useEffect(() => { load() }, [page, keyword, catFilter])

    const load = async () => {
        setLoading(true)
        try {
            const r = await productApi.getAll({ keyword: keyword || undefined, categoryId: catFilter || undefined, page, pageSize: 15 })
            setProducts(r.data.items || [])
            setTotalPages(r.data.totalPages || 0)
            setTotalCount(r.data.totalCount || 0)
        } catch { } finally { setLoading(false) }
    }

    const openModal = (p = null) => {
        if (p) {
            setEditing(p)
            setForm({ name: p.name, price: p.price, stock: p.stock, categoryId: p.categoryId, manufacturerId: p.manufacturerId || '', description: p.description || '', imageUrl: p.imageUrl || '', discountPercent: p.discountPercent || 0, stockNote: '' })
        } else {
            setEditing(null)
            setForm({ name: '', price: 0, stock: 0, categoryId: categories[0]?.id || '', manufacturerId: '', description: '', imageUrl: '', discountPercent: 0, stockNote: '' })
        }
        setImgMode('url')
        setImgPreview('')
        setPendingFile(null)
        setError('')
        setShowModal(true)
    }

    const handleFileChange = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPendingFile(file)
        setImgPreview(URL.createObjectURL(file))
    }

    const switchImgMode = (m) => {
        setImgMode(m)
        setPendingFile(null)
        setImgPreview('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        try {
            const payload = {
                ...form,
                price: parseFloat(form.price),
                stock: parseInt(form.stock),
                categoryId: parseInt(form.categoryId),
                manufacturerId: form.manufacturerId ? parseInt(form.manufacturerId) : null,
                discountPercent: parseFloat(form.discountPercent) || 0,
            }
            if (editing) {
                if (pendingFile) {
                    const up = await productApi.uploadImage(editing.id, pendingFile)
                    payload.imageUrl = up.data.imageUrl
                }
                await warehouseApi.updateProduct(editing.id, payload)
            } else {
                const res = await warehouseApi.createProduct(payload)
                if (pendingFile && res.data.id) {
                    await productApi.uploadImage(res.data.id, pendingFile)
                }
            }
            setShowModal(false)
            setPage(1)
            load()
        } catch (err) {
            setError(err.response?.data?.message || 'Thao tác thất bại')
        }
    }

    const handleDelete = async (id) => {
        if (!window.confirm('Xóa sản phẩm này? Không thể hoàn tác nếu đã có đơn hàng liên quan.')) return
        try { await warehouseApi.deleteProduct(id); load() }
        catch (err) { alert(err.response?.data?.message || 'Xóa thất bại') }
    }

    const getStockBadge = (s) => {
        if (s === 0) return <span className="badge badge-danger">Hết hàng</span>
        if (s <= 10) return <span className="badge badge-warning">{fmt(s)}</span>
        return <span className="badge badge-success">{fmt(s)}</span>
    }

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0"><i className="fas fa-box-open mr-2"></i>Quản lý sản phẩm</h1>
                </div>
            </div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-header">
                            <div className="row align-items-center">
                                <div className="col-md-7">
                                    <form onSubmit={(e) => { e.preventDefault(); setPage(1); load() }} className="form-inline flex-wrap">
                                        <input className="form-control form-control-sm mr-2 mb-1" placeholder="Tìm tên sản phẩm..." value={keyword} onChange={e => setKeyword(e.target.value)} />
                                        <select className="form-control form-control-sm mr-2 mb-1" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}>
                                            <option value="">Tất cả danh mục</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <button type="submit" className="btn btn-sm btn-primary mb-1"><i className="fas fa-search"></i></button>
                                    </form>
                                </div>
                                <div className="col-md-5 text-right">
                                    <button className="btn btn-success btn-sm" onClick={() => openModal()}>
                                        <i className="fas fa-plus mr-1"></i>Thêm sản phẩm
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <table className="table table-bordered table-striped table-hover mb-0">
                                    <thead className="thead-dark">
                                        <tr>
                                            <th style={{ width: 60 }}>Ảnh</th>
                                            <th>Tên sản phẩm</th>
                                            <th>Danh mục</th>
                                            <th>NSX</th>
                                            <th className="text-right">Giá bán</th>
                                            <th className="text-right">Giảm giá</th>
                                            <th className="text-center">Tồn kho</th>
                                            <th style={{ width: 110 }}>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr><td colSpan="8" className="text-center text-muted py-4">Không có sản phẩm nào</td></tr>
                                        ) : products.map(p => (
                                            <tr key={p.id}>
                                                <td className="text-center p-1">
                                                    {p.imageUrl
                                                        ? <img src={p.imageUrl} alt={p.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid #dee2e6' }} onError={e => { e.target.style.display='none' }} />
                                                        : <div style={{ width: 44, height: 44, background: '#f8f9fa', borderRadius: 4, border: '1px dashed #dee2e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fas fa-image text-muted" style={{ fontSize: 16 }}></i></div>
                                                    }
                                                </td>
                                                <td>
                                                    <strong>{p.name}</strong>
                                                    {p.description && <div className="text-muted small" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                                                </td>
                                                <td><span className="badge badge-secondary">{p.categoryName}</span></td>
                                                <td>{p.manufacturerName || <span className="text-muted">—</span>}</td>
                                                <td className="text-right">{fmt(p.price)} đ</td>
                                                <td className="text-right">{p.discountPercent > 0 ? <span className="badge badge-warning">{p.discountPercent}%</span> : <span className="text-muted">—</span>}</td>
                                                <td className="text-center">{getStockBadge(p.stock)}</td>
                                                <td>
                                                    <button className="btn btn-sm btn-info mr-1" onClick={() => openModal(p)}><i className="fas fa-edit"></i></button>
                                                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(p.id)}><i className="fas fa-trash"></i></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="card-footer d-flex justify-content-between align-items-center">
                            <span className="text-muted">Tổng: <strong>{totalCount}</strong> sản phẩm</span>
                            <ul className="pagination mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page - 1)}>‹</button></li>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>
                                ))}
                                <li className={`page-item ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page + 1)}>›</button></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {showModal && (
                <>
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title"><i className="fas fa-box-open mr-2"></i>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h5>
                                    <button className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        {error && <div className="alert alert-danger">{error}</div>}
                                        <div className="row">
                                            <div className="col-md-8">
                                                <div className="form-group">
                                                    <label>Tên sản phẩm <span className="text-danger">*</span></label>
                                                    <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label>Giá bán (đ) <span className="text-danger">*</span></label>
                                                    <input type="number" className="form-control" required min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Danh mục <span className="text-danger">*</span></label>
                                                    <select className="form-control" required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                                                        <option value="">-- Chọn danh mục --</option>
                                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="form-group">
                                                    <label>Nhà sản xuất</label>
                                                    <select className="form-control" value={form.manufacturerId} onChange={e => setForm({ ...form, manufacturerId: e.target.value })}>
                                                        <option value="">-- Không có --</option>
                                                        {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label>
                                                        Tồn kho
                                                        {editing && <small className="text-warning ml-1">(thay đổi sẽ tạo commit)</small>}
                                                    </label>
                                                    <input type="number" className="form-control" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="col-md-4">
                                                <div className="form-group">
                                                    <label>Giảm giá (%)</label>
                                                    <input type="number" className="form-control" min="0" max="100" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: e.target.value })} />
                                                </div>
                                            </div>
                                            {editing && (
                                                <div className="col-md-4">
                                                    <div className="form-group">
                                                        <label>Lý do điều chỉnh kho</label>
                                                        <input className="form-control" placeholder="Ghi chú commit..." value={form.stockNote} onChange={e => setForm({ ...form, stockNote: e.target.value })} />
                                                    </div>
                                                </div>
                                            )}
                                            <div className="col-12">
                                                <div className="form-group">
                                                    <label>Ảnh sản phẩm</label>

                                                    {/* Preview box */}
                                                    <div className="mb-2 text-center" style={{ background: '#f8f9fa', border: '1px dashed #ced4da', borderRadius: 6, padding: 10, minHeight: 110 }}>
                                                        {(imgPreview || form.imageUrl) ? (
                                                            <img
                                                                src={imgPreview || form.imageUrl}
                                                                alt="preview"
                                                                style={{ maxHeight: 130, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }}
                                                                onError={e => { e.target.style.display = 'none' }}
                                                            />
                                                        ) : (
                                                            <div className="text-muted py-3">
                                                                <i className="fas fa-image fa-2x d-block mb-1 opacity-50"></i>
                                                                <small>Chưa có ảnh</small>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Mode toggle */}
                                                    <div className="btn-group btn-group-sm w-100 mb-2" role="group">
                                                        <button type="button"
                                                            className={`btn ${imgMode === 'url' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                                            onClick={() => switchImgMode('url')}>
                                                            <i className="fas fa-link mr-1"></i>Nhập URL
                                                        </button>
                                                        <button type="button"
                                                            className={`btn ${imgMode === 'upload' ? 'btn-info' : 'btn-outline-info'}`}
                                                            onClick={() => switchImgMode('upload')}>
                                                            <i className="fas fa-upload mr-1"></i>Tải lên từ máy
                                                        </button>
                                                    </div>

                                                    {imgMode === 'url' && (
                                                        <input
                                                            className="form-control form-control-sm"
                                                            placeholder="https://example.com/anh.jpg"
                                                            value={form.imageUrl}
                                                            onChange={e => { setForm({ ...form, imageUrl: e.target.value }); setImgPreview('') }}
                                                        />
                                                    )}
                                                    {imgMode === 'upload' && (
                                                        <div className="custom-file">
                                                            <input
                                                                type="file"
                                                                className="custom-file-input"
                                                                id="prodImgFile"
                                                                accept="image/jpeg,image/png,image/gif,image/webp"
                                                                ref={fileInputRef}
                                                                onChange={handleFileChange}
                                                            />
                                                            <label className="custom-file-label" htmlFor="prodImgFile" style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                                {pendingFile ? pendingFile.name : 'Chọn file ảnh (.jpg .png .gif .webp)'}
                                                            </label>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <div className="form-group">
                                                    <label>Mô tả sản phẩm</label>
                                                    <textarea className="form-control" rows="3" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                                        <button type="submit" className="btn btn-primary">
                                            <i className={`fas fa-${editing ? 'save' : 'plus'} mr-1`}></i>
                                            {editing ? 'Lưu thay đổi' : 'Tạo mới'}
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
