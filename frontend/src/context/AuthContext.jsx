import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(() => localStorage.getItem('cs_token'))
  const [loading, setLoading] = useState(true)   // resolves after initial /me check

  // Set axios default auth header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      localStorage.setItem('cs_token', token)
    } else {
      delete axios.defaults.headers.common['Authorization']
      localStorage.removeItem('cs_token')
    }
  }, [token])

  // On mount — if a token exists, verify it and hydrate user state
  useEffect(() => {
    const verify = async () => {
      if (!token) { setLoading(false); return }
      try {
        const res = await axios.get('/api/auth/me')
        setUser(res.data.user)
      } catch {
        // Token invalid / expired — clear it
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    verify()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password })
    const { token: newToken, user: newUser } = res.data
    setToken(newToken)
    setUser(newUser)
    return newUser
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await axios.post('/api/auth/register', { name, email, password })
    const { token: newToken, user: newUser } = res.data
    setToken(newToken)
    setUser(newUser)
    return newUser
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
