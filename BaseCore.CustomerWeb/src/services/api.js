import axiosClient from '../api/axiosClient'

const wrap = (promise) => promise.then(data => ({ data }))

export const authApi = {
  login: (username, password) => wrap(axiosClient.post('/auth/login', { username, password })),
  register: (data) => wrap(axiosClient.post('/auth/register', data)),
}

export const userApi = {
  getAll: (params) => wrap(axiosClient.get('/users', { params })),
  getById: (id) => wrap(axiosClient.get(`/users/${id}`)),
  create: (data) => wrap(axiosClient.post('/users', data)),
  update: (id, data) => wrap(axiosClient.put(`/users/${id}`, data)),
  delete: (id) => wrap(axiosClient.delete(`/users/${id}`)),
}

export const productApi = {
  getAll: (params) => wrap(axiosClient.get('/products', { params })),
  search: (params) => wrap(axiosClient.get('/products', { params })),
  getById: (id) => wrap(axiosClient.get(`/products/${id}`)),
  create: (data) => wrap(axiosClient.post('/products', data)),
  update: (id, data) => wrap(axiosClient.put(`/products/${id}`, data)),
  delete: (id) => wrap(axiosClient.delete(`/products/${id}`)),
  updateDiscount: (id, discountPercent) => wrap(axiosClient.put(`/products/${id}/discount`, { discountPercent })),
  getReviews: (id) => wrap(axiosClient.get(`/products/${id}/reviews`)),
  createReview: (id, data) => wrap(axiosClient.post(`/products/${id}/reviews`, data)),
  uploadImage: (id, file) => {
    const fd = new FormData()
    fd.append('image', file)
    return wrap(axiosClient.post(`/products/${id}/image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }))
  },
}

export const categoryApi = {
  getAll: () => wrap(axiosClient.get('/categories')),
  getById: (id) => wrap(axiosClient.get(`/categories/${id}`)),
  create: (data) => wrap(axiosClient.post('/categories', data)),
  update: (id, data) => wrap(axiosClient.put(`/categories/${id}`, data)),
  delete: (id) => wrap(axiosClient.delete(`/categories/${id}`)),
}

export const manufacturerApi = {
  getAll: (params) => wrap(axiosClient.get('/manufacturers', { params })),
  getById: (id) => wrap(axiosClient.get(`/manufacturers/${id}`)),
  create: (data) => wrap(axiosClient.post('/manufacturers', data)),
  update: (id, data) => wrap(axiosClient.put(`/manufacturers/${id}`, data)),
  delete: (id) => wrap(axiosClient.delete(`/manufacturers/${id}`)),
}

export const dashboardApi = {
  getStats: () => wrap(axiosClient.get('/dashboard/stats')),
}

export const orderApi = {
  create: (data) => wrap(axiosClient.post('/orders', data)),
  getMyOrders: () => wrap(axiosClient.get('/orders')),
  getById: (id) => wrap(axiosClient.get(`/orders/${id}`)),
  getAllOrders: (params) => wrap(axiosClient.get('/orders/all', { params })),
  getStats: () => wrap(axiosClient.get('/orders/stats')),
  getRevenueSummary: (params) => wrap(axiosClient.get('/orders/revenue-summary', { params })),
  approve: (id) => wrap(axiosClient.put(`/orders/${id}/approve`)),
  reject: (id, reason) => wrap(axiosClient.put(`/orders/${id}/reject`, { reason })),
  updateStatus: (id, status) => wrap(axiosClient.put(`/orders/${id}/status`, { status })),
  cancel: (id) => wrap(axiosClient.put(`/orders/${id}/cancel`)),
  markReceived: (id) => wrap(axiosClient.put(`/orders/${id}/received`)),
}

export const warehouseApi = {
  getInventory: () => wrap(axiosClient.get('/warehouse/inventory')),
  getReceipts: (params) => wrap(axiosClient.get('/warehouse/receipts', { params })),
  createReceipt: (data) => wrap(axiosClient.post('/warehouse/receipts', data)),
  updateReceipt: (id, data) => wrap(axiosClient.put(`/warehouse/receipts/${id}`, data)),
  deleteReceipt: (id) => wrap(axiosClient.delete(`/warehouse/receipts/${id}`)),
  getDamaged: (params) => wrap(axiosClient.get('/warehouse/damaged', { params })),
  createDamaged: (data) => wrap(axiosClient.post('/warehouse/damaged', data)),
  deleteDamaged: (id) => wrap(axiosClient.delete(`/warehouse/damaged/${id}`)),
  getReport: (params) => wrap(axiosClient.get('/warehouse/report', { params })),
  getTransactions: (params) => wrap(axiosClient.get('/warehouse/transactions', { params })),
  getProducts: (params) => wrap(axiosClient.get('/warehouse/products', { params })),
  createProduct: (data) => wrap(axiosClient.post('/warehouse/products', data)),
  updateProduct: (id, data) => wrap(axiosClient.put(`/warehouse/products/${id}`, data)),
  deleteProduct: (id) => wrap(axiosClient.delete(`/warehouse/products/${id}`)),
}

export default axiosClient
