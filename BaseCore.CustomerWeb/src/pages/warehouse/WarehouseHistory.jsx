import React, { useState, useEffect } from 'react'
import { warehouseApi } from '../../services/api'

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0)

const typeConfig = {
    'Nhập kho':           { badge: 'success',   icon: 'fa-arrow-up' },
    'Điều chỉnh nhập':    { badge: 'info',      icon: 'fa-edit' },
    'Hoàn nhập kho':      { badge: 'secondary', icon: 'fa-arrow-down' },
    'Hư hỏng':            { badge: 'danger',    icon: 'fa-exclamation-triangle' },
    'Hoàn hư hỏng':       { badge: 'secondary', icon: 'fa-undo' },
    'Điều chỉnh thủ công':{ badge: 'warning',   icon: 'fa-sliders-h' },
    'Tạo sản phẩm':       { badge: 'primary',   icon: 'fa-plus' },
}

export default function WarehouseHistory() {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(0)
    const [totalCount, setTotalCount] = useState(0)
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => { load() }, [page, startDate, endDate])

    const load = async () => {
        setLoading(true)
        try {
            const params = { page, pageSize: 20 }
            if (startDate) params.startDate = startDate
            if (endDate) params.endDate = endDate
            const r = await warehouseApi.getTransactions(params)
            setLogs(r.data.items || [])
            setTotalPages(r.data.totalPages || 0)
            setTotalCount(r.data.totalCount || 0)
        } catch { } finally { setLoading(false) }
    }

    const cfg = (type) => typeConfig[type] || { badge: 'secondary', icon: 'fa-circle' }

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0"><i className="fas fa-history mr-2"></i>Lịch sử giao dịch kho</h1>
                </div>
            </div>
            <section className="content">
                <div className="container-fluid">
                    <div className="card">
                        <div className="card-header">
                            <div className="row align-items-center">
                                <div className="col-md-8">
                                    <div className="input-group input-group-sm">
                                        <div className="input-group-prepend"><span className="input-group-text">Từ</span></div>
                                        <input type="date" className="form-control" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} />
                                        <div className="input-group-prepend input-group-append"><span className="input-group-text">đến</span></div>
                                        <input type="date" className="form-control" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} />
                                        <div className="input-group-append">
                                            <button className="btn btn-default btn-sm" onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}>
                                                <i className="fas fa-times"></i> Xóa lọc
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 text-right">
                                    <span className="text-muted">Tổng: <strong>{totalCount}</strong> giao dịch</span>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <table className="table table-bordered table-sm table-striped mb-0">
                                    <thead className="thead-dark">
                                        <tr>
                                            <th style={{ width: 160 }}>Thời gian</th>
                                            <th>Sản phẩm</th>
                                            <th>Danh mục</th>
                                            <th>Loại giao dịch</th>
                                            <th className="text-center" style={{ width: 100 }}>Thay đổi SL</th>
                                            <th className="text-center">Trước</th>
                                            <th className="text-center">Sau</th>
                                            <th>Ghi chú</th>
                                            <th>Người thực hiện</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.length === 0 ? (
                                            <tr><td colSpan="9" className="text-center text-muted py-4">Chưa có giao dịch nào</td></tr>
                                        ) : logs.map(l => {
                                            const c = cfg(l.transactionType)
                                            const plus = l.quantity > 0
                                            return (
                                                <tr key={l.id}>
                                                    <td className="text-muted small">{new Date(l.createdAt).toLocaleString('vi-VN')}</td>
                                                    <td><strong>{l.productName}</strong></td>
                                                    <td><span className="badge badge-secondary">{l.categoryName}</span></td>
                                                    <td>
                                                        <span className={`badge badge-${c.badge}`}>
                                                            <i className={`fas ${c.icon} mr-1`}></i>{l.transactionType}
                                                        </span>
                                                    </td>
                                                    <td className={`text-center font-weight-bold ${plus ? 'text-success' : 'text-danger'}`}>
                                                        {plus ? '+' : ''}{fmt(l.quantity)}
                                                    </td>
                                                    <td className="text-center">{fmt(l.stockBefore)}</td>
                                                    <td className="text-center font-weight-bold">{fmt(l.stockAfter)}</td>
                                                    <td className="text-muted small">{l.notes}</td>
                                                    <td className="text-muted small">{l.createdBy || '—'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="card-footer d-flex justify-content-end">
                            <ul className="pagination mb-0">
                                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page - 1)}>‹</button></li>
                                {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map(p => (
                                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(p)}>{p}</button></li>
                                ))}
                                <li className={`page-item ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(page + 1)}>›</button></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
