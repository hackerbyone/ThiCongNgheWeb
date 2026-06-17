import React, { useState, useEffect } from 'react'
import { warehouseApi, productApi } from '../../services/api'
import { Link } from 'react-router-dom'

const fmt = (n) => new Intl.NumberFormat('vi-VN').format(n || 0)
const fmtCur = (n) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n || 0)

export default function WarehouseDashboard() {
    const [inventory, setInventory] = useState([])
    const [report, setReport] = useState(null)
    const [recentLogs, setRecentLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadAll() }, [])

    const loadAll = async () => {
        setLoading(true)
        try {
            const invRes = await productApi.getAll({ pageSize: 999 })
            setInventory(invRes.data.items || [])
        } catch { }
        try {
            const rptRes = await warehouseApi.getReport({
                startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
            })
            setReport(rptRes.data)
        } catch { }
        try {
            const logRes = await warehouseApi.getTransactions({ page: 1, pageSize: 5 })
            setRecentLogs(logRes.data.items || [])
        } catch { }
        setLoading(false)
    }

    if (loading) return <div className="content-wrapper"><div className="text-center py-5"><div className="spinner-border text-primary"></div></div></div>

    const outOfStock = inventory.filter(i => i.stock === 0).length
    const lowStock   = inventory.filter(i => i.stock > 0 && i.stock <= 10).length
    const totalItems = inventory.length

    const typeConfig = {
        'Nhập kho': { badge: 'success', icon: 'fa-arrow-up' },
        'Hư hỏng':  { badge: 'danger',  icon: 'fa-exclamation-triangle' },
        'Điều chỉnh thủ công': { badge: 'warning', icon: 'fa-sliders-h' },
    }
    const cfg = (t) => typeConfig[t] || { badge: 'secondary', icon: 'fa-circle' }

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <h1 className="m-0"><i className="fas fa-tachometer-alt mr-2"></i>Tổng quan kho hàng</h1>
                    <small className="text-muted">Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</small>
                </div>
            </div>
            <section className="content">
                <div className="container-fluid">
                    {/* Stats */}
                    <div className="row">
                        <div className="col-lg-3 col-md-6">
                            <div className="small-box bg-info">
                                <div className="inner"><h3>{fmt(totalItems)}</h3><p>Tổng loại sản phẩm</p></div>
                                <div className="icon"><i className="fas fa-box-open"></i></div>
                                <Link to="/warehouse/products" className="small-box-footer">Quản lý <i className="fas fa-arrow-circle-right"></i></Link>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className={`small-box ${outOfStock > 0 ? 'bg-danger' : 'bg-success'}`}>
                                <div className="inner"><h3>{fmt(outOfStock)}</h3><p>Sản phẩm hết hàng</p></div>
                                <div className="icon"><i className="fas fa-times-circle"></i></div>
                                <Link to="/warehouse/stock" className="small-box-footer">Xem tồn kho <i className="fas fa-arrow-circle-right"></i></Link>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className={`small-box ${lowStock > 0 ? 'bg-warning' : 'bg-success'}`}>
                                <div className="inner"><h3>{fmt(lowStock)}</h3><p>Sắp hết hàng (≤10)</p></div>
                                <div className="icon"><i className="fas fa-exclamation-circle"></i></div>
                                <Link to="/warehouse/stock" className="small-box-footer">Xem chi tiết <i className="fas fa-arrow-circle-right"></i></Link>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className="small-box bg-success">
                                <div className="inner">
                                    <h3>{fmt(report?.summary?.totalRevenue ?? 0)}</h3>
                                    <p>Doanh thu tháng này (₫)</p>
                                </div>
                                <div className="icon"><i className="fas fa-coins"></i></div>
                                <Link to="/warehouse/report" className="small-box-footer">Xem báo cáo <i className="fas fa-arrow-circle-right"></i></Link>
                            </div>
                        </div>
                    </div>

                    <div className="row" style={{ alignItems: 'stretch' }}>
                        {/* Month summary */}
                        <div className="col-lg-4 col-md-6 d-flex flex-column mb-3">
                            <div className="card flex-fill mb-0">
                                <div className="card-header"><h3 className="card-title"><i className="fas fa-chart-pie mr-2"></i>Tháng này</h3></div>
                                <div className="card-body p-0 flex-fill">
                                    <ul className="list-group list-group-flush">
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span><i className="fas fa-truck-loading text-info mr-2"></i>Tổng nhập</span>
                                            <strong className="text-info">{fmt(report?.summary?.totalReceived)} sản phẩm</strong>
                                        </li>
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span><i className="fas fa-shopping-cart text-success mr-2"></i>Tổng bán</span>
                                            <strong className="text-success">{fmt(report?.summary?.totalSold)} sản phẩm</strong>
                                        </li>
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span><i className="fas fa-exclamation-triangle text-danger mr-2"></i>Hư hỏng</span>
                                            <strong className="text-danger">{fmt(report?.summary?.totalDamaged)} sản phẩm</strong>
                                        </li>
                                        <li className="list-group-item d-flex justify-content-between">
                                            <span><i className="fas fa-receipt text-secondary mr-2"></i>Chi phí nhập</span>
                                            <strong>{fmtCur(report?.summary?.totalCost)}</strong>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Sắp hết hàng */}
                        <div className="col-lg-4 col-md-6 d-flex flex-column mb-3">
                            <div className="card card-warning flex-fill mb-0">
                                <div className="card-header"><h3 className="card-title"><i className="fas fa-exclamation-circle mr-2"></i>Cảnh báo tồn kho thấp</h3></div>
                                <div className="card-body p-0 flex-fill" style={{ overflowY: 'auto', maxHeight: 220 }}>
                                    {inventory.filter(i => i.stock <= 10).length === 0 ? (
                                        <div className="text-center text-muted py-3"><i className="fas fa-check-circle text-success mr-1"></i>Tất cả sản phẩm đủ hàng</div>
                                    ) : (
                                        <ul className="list-group list-group-flush">
                                            {inventory.filter(i => i.stock <= 10).map(i => (
                                                <li key={i.id} className="list-group-item py-2 d-flex justify-content-between align-items-center">
                                                    <span className="small">{i.name}</span>
                                                    <span className={`badge ${i.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                                                        {i.stock === 0 ? 'Hết' : i.stock}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="card-footer">
                                    <Link to="/warehouse/receipts" className="btn btn-sm btn-warning btn-block">
                                        <i className="fas fa-truck-loading mr-1"></i>Nhập hàng ngay
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Recent transactions */}
                        <div className="col-lg-4 col-md-12 d-flex flex-column mb-3">
                            <div className="card flex-fill mb-0">
                                <div className="card-header"><h3 className="card-title"><i className="fas fa-history mr-2"></i>Giao dịch gần đây</h3></div>
                                <div className="card-body p-0 flex-fill">
                                    {recentLogs.length === 0 ? (
                                        <div className="text-center text-muted py-3">Chưa có giao dịch</div>
                                    ) : (
                                        <ul className="list-group list-group-flush">
                                            {recentLogs.map(l => {
                                                const c = cfg(l.transactionType)
                                                return (
                                                    <li key={l.id} className="list-group-item py-2">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className="small font-weight-bold">{l.productName}</span>
                                                            <span className={`badge badge-${c.badge}`}>
                                                                {l.quantity > 0 ? '+' : ''}{fmt(l.quantity)}
                                                            </span>
                                                        </div>
                                                        <div className="d-flex justify-content-between">
                                                            <span className="text-muted small"><i className={`fas ${c.icon} mr-1`}></i>{l.transactionType}</span>
                                                            <span className="text-muted small">{new Date(l.createdAt).toLocaleDateString('vi-VN')}</span>
                                                        </div>
                                                    </li>
                                                )
                                            })}
                                        </ul>
                                    )}
                                </div>
                                <div className="card-footer">
                                    <Link to="/warehouse/history" className="btn btn-sm btn-default btn-block">
                                        <i className="fas fa-history mr-1"></i>Xem toàn bộ lịch sử
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
