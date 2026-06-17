import { createContext, useContext, useState, useEffect } from 'react'
import authApi from '../api/authApi'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Khôi phục phiên đăng nhập khi reload trang
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (userName, password) => {
    // axiosClient interceptor đã unwrap response.data, nên res = { token, userId, username, name, email, role }
    const res = await authApi.login({ userName, password })
    const token = res.token
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(res))
    setUser(res)
    return res
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const register = async (payload) => {
    return authApi.register(payload)
  }

  const isAdmin = () => {
    if (!user) return false
    const role = (user.role || user.Role || '').toLowerCase()
    return role === 'admin'
  }

  const isWarehouse = () => {
    if (!user) return false
    const role = (user.role || user.Role || '').toLowerCase()
    return role === 'warehouse'
  }

  const isAdminOrWarehouse = () => isAdmin() || isWarehouse()

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, isAdmin, isWarehouse, isAdminOrWarehouse, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
