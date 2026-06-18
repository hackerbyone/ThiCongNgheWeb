import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import AdminLayout from './pages/admin/AdminLayout'

// Customer pages
import Home from './pages/Home'
import ProductList from './pages/ProductList'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Payment from './pages/Payment'
import Login from './pages/Login'
import Register from './pages/Register'
import MyOrders from './pages/MyOrders'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'

// Admin pages
import Dashboard from './pages/admin/Dashboard'
import AdminProducts from './pages/admin/Products'
import AdminCategories from './pages/admin/Categories'
import AdminUsers from './pages/admin/Users'
import AdminOrders from './pages/admin/Orders'
import AdminManufacturers from './pages/admin/Manufacturers'

// Warehouse portal pages
import WarehouseLayout from './pages/warehouse/WarehouseLayout'
import WarehouseDashboard from './pages/warehouse/WarehouseDashboard'
import WarehouseProducts from './pages/warehouse/WarehouseProducts'
import WarehouseHistory from './pages/warehouse/WarehouseHistory'
import { WStock, WReceipts, WDamaged, WReport, WCategories } from './pages/warehouse/WarehousePages'

// Guard: chỉ cho vào nếu đã login và là Admin
function AdminRoute({ children }) {
  const { user, loading, isAdmin, isWarehouse } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin || !isAdmin()) {
    if (isWarehouse && isWarehouse()) return <Navigate to="/warehouse" replace />
    return <Navigate to="/" replace />
  }
  return <AdminLayout>{children}</AdminLayout>
}

// Guard cho /warehouse portal (WarehouseLayout)
function WHPortalRoute({ children }) {
  const { user, loading, isAdmin, isWarehouse } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if ((!isAdmin || !isAdmin()) && (!isWarehouse || !isWarehouse())) return <Navigate to="/" replace />
  return <WarehouseLayout>{children}</WarehouseLayout>
}

// Layout dành cho trang khách hàng
function CustomerLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Customer routes */}
      <Route path="/" element={<CustomerLayout><Home /></CustomerLayout>} />
      <Route path="/products" element={<CustomerLayout><ProductList /></CustomerLayout>} />
      <Route path="/category/:id" element={<CustomerLayout><ProductList /></CustomerLayout>} />
      <Route path="/search" element={<CustomerLayout><ProductList /></CustomerLayout>} />
      <Route path="/product/:id" element={<CustomerLayout><ProductDetail /></CustomerLayout>} />
      <Route path="/cart" element={<CustomerLayout><Cart /></CustomerLayout>} />
      <Route path="/checkout" element={<CustomerLayout><Checkout /></CustomerLayout>} />
      <Route path="/orders/success" element={<CustomerLayout><OrderSuccess /></CustomerLayout>} />
      <Route path="/payment/:orderId" element={<CustomerLayout><Payment /></CustomerLayout>} />
      <Route path="/orders" element={<CustomerLayout><MyOrders /></CustomerLayout>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/contact" element={<CustomerLayout><Contact /></CustomerLayout>} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
      <Route path="/admin/categories" element={<AdminRoute><AdminCategories /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
      <Route path="/admin/manufacturers" element={<AdminRoute><AdminManufacturers /></AdminRoute>} />

      {/* Warehouse Portal — trang riêng nhân viên kho */}
      <Route path="/warehouse" element={<WHPortalRoute><WarehouseDashboard /></WHPortalRoute>} />
      <Route path="/warehouse/products" element={<WHPortalRoute><WarehouseProducts /></WHPortalRoute>} />
      <Route path="/warehouse/stock" element={<WHPortalRoute><WStock /></WHPortalRoute>} />
      <Route path="/warehouse/receipts" element={<WHPortalRoute><WReceipts /></WHPortalRoute>} />
      <Route path="/warehouse/damaged" element={<WHPortalRoute><WDamaged /></WHPortalRoute>} />
      <Route path="/warehouse/history" element={<WHPortalRoute><WarehouseHistory /></WHPortalRoute>} />
      <Route path="/warehouse/categories" element={<WHPortalRoute><WCategories /></WHPortalRoute>} />
      <Route path="/warehouse/report" element={<WHPortalRoute><WReport /></WHPortalRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
