import React, { useState, useEffect } from 'react';
import { productApi, categoryApi, manufacturerApi } from '../../services/api';
import { Link } from 'react-router-dom';

const Products = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [manufacturerId, setManufacturerId] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const [loadError, setLoadError] = useState('');

    useEffect(() => { loadCategories(); loadManufacturers(); }, []);
    useEffect(() => { loadProducts(); }, [page, keyword, categoryId, manufacturerId]);

    const loadCategories = async () => {
        try { const r = await categoryApi.getAll(); setCategories(r.data || []); } catch {}
    };
    const loadManufacturers = async () => {
        try { const r = await manufacturerApi.getAll(); setManufacturers(r.data || []); } catch {}
    };

    const loadProducts = async () => {
        setLoading(true); setLoadError('');
        try {
            const r = await productApi.search({ keyword, categoryId: categoryId || undefined, manufacturerId: manufacturerId || undefined, page, pageSize });
            setProducts(r.data.items || r.data.data || []);
            setTotalPages(r.data.totalPages || 0);
            setTotalCount(r.data.totalCount || 0);
        } catch (err) {
            setLoadError('Không thể tải danh sách sản phẩm');
        } finally { setLoading(false); }
    };

    const handleSearch = (e) => { e.preventDefault(); setPage(1); loadProducts(); };

    const renderPagination = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(
                <li key={i} className={`page-item ${page === i ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPage(i)}>{i}</button>
                </li>
            );
        }
        return pages;
    };

    const getStockBadge = (stock) => {
        if (stock === 0) return <span className="badge badge-danger">Hết hàng</span>;
        if (stock <= 10) return <span className="badge badge-warning">{stock} (Sắp hết)</span>;
        return <span className="badge badge-success">{stock}</span>;
    };

    return (
        <div className="content-wrapper">
            <div className="content-header">
                <div className="container-fluid">
                    <div className="row mb-2">
                        <div className="col-sm-6">
                            <h1 className="m-0">Xem danh sách sản phẩm</h1>
                        </div>
                    </div>
                </div>
            </div>

            <section className="content">
                <div className="container-fluid">
                    <div className="alert alert-info d-flex align-items-center mb-3">
                        <i className="fas fa-info-circle mr-2 fa-lg"></i>
                        <span>
                            Trang này chỉ dùng để xem. Để <strong>thêm, sửa, xóa sản phẩm</strong> hoặc <strong>điều chỉnh số lượng tồn kho</strong>, vui lòng vào&nbsp;
                            <Link to="/warehouse" className="font-weight-bold">Trang quản lý kho hàng</Link>.
                        </span>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <div className="row">
                                <div className="col-md-10">
                                    <form onSubmit={handleSearch} className="form-inline flex-wrap">
                                        <input type="text" className="form-control mr-2 mb-1"
                                            placeholder="Tìm kiếm sản phẩm..."
                                            value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                                        <select className="form-control mr-2 mb-1" value={categoryId}
                                            onChange={(e) => setCategoryId(e.target.value)}>
                                            <option value="">Tất cả danh mục</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <select className="form-control mr-2 mb-1" value={manufacturerId}
                                            onChange={(e) => setManufacturerId(e.target.value)}>
                                            <option value="">Tất cả NSX</option>
                                            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                        <button type="submit" className="btn btn-primary mb-1">
                                            <i className="fas fa-search"></i> Tìm
                                        </button>
                                    </form>
                                </div>
                                <div className="col-md-2 text-right">
                                    <Link to="/warehouse" className="btn btn-success btn-sm">
                                        <i className="fas fa-warehouse mr-1"></i>Quản lý kho
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className="card-body p-0">
                            {loadError && (
                                <div className="alert alert-danger m-3">{loadError}</div>
                            )}
                            {loading ? (
                                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
                            ) : (
                                <table className="table table-bordered table-striped table-hover mb-0">
                                    <thead className="thead-dark">
                                        <tr>
                                            <th style={{ width: 50 }}>ID</th>
                                            <th>Tên sản phẩm</th>
                                            <th>Danh mục</th>
                                            <th>Nhà sản xuất</th>
                                            <th className="text-right">Giá bán</th>
                                            <th className="text-right">Giảm giá</th>
                                            <th className="text-center">Tồn kho</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {products.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted py-4">
                                                    {loadError ? 'Lỗi tải dữ liệu' : 'Không tìm thấy sản phẩm nào'}
                                                </td>
                                            </tr>
                                        ) : products.map(p => (
                                            <tr key={p.id}>
                                                <td className="text-muted">{p.id}</td>
                                                <td>
                                                    <strong>{p.name}</strong>
                                                    {p.description && (
                                                        <div className="text-muted small" style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {p.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td><span className="badge badge-secondary">{p.category?.name}</span></td>
                                                <td>{p.manufacturer?.name || <span className="text-muted">—</span>}</td>
                                                <td className="text-right">{p.price?.toLocaleString('vi-VN')} đ</td>
                                                <td className="text-right">
                                                    {p.discountPercent > 0
                                                        ? <span className="badge badge-warning">{p.discountPercent}%</span>
                                                        : <span className="text-muted">—</span>
                                                    }
                                                </td>
                                                <td className="text-center">{getStockBadge(p.stock)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <div className="card-footer d-flex justify-content-between align-items-center">
                            <span className="text-muted">Tổng: <strong>{totalCount}</strong> sản phẩm</span>
                            <nav>
                                <ul className="pagination mb-0">
                                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(page - 1)}>‹</button>
                                    </li>
                                    {renderPagination()}
                                    <li className={`page-item ${page === totalPages || totalPages === 0 ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(page + 1)}>›</button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Products;
