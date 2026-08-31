import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User } from '../types'
import { AuthService } from '../api/service'

interface AuthContextValue {
  user: User | null
  loading: boolean
  initializing: boolean
  login: (email: string, password: string) => Promise<User>
  completeGoogleLogin: (token: string) => Promise<User>
  updateUser: (user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'

function readStoredUser(): User | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const rawUser = localStorage.getItem(USER_KEY)
    if (!token || !rawUser) return null
    return JSON.parse(rawUser) as User
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Hydrate synchronously from localStorage so a page refresh doesn't
  // briefly (or permanently) look logged-out before an effect runs.
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const [loading, setLoading] = useState(false)
  // Nothing async to wait for since hydration above is synchronous, but
  // keep the flag so consumers (e.g. ProtectedRoute) have a stable signal.
  const [initializing] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true)
    try {
      const { token, user: loggedInUser } = await AuthService.login(email, password)
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser))
      setUser(loggedInUser)
      return loggedInUser
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])
  const completeGoogleLogin = useCallback(async (token: string) => {
    localStorage.setItem(TOKEN_KEY, token)
    const loggedInUser = await AuthService.getMe()
    localStorage.setItem(USER_KEY, JSON.stringify(loggedInUser)); setUser(loggedInUser)
    return loggedInUser
  }, [])

  const updateUser = useCallback((updated: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(updated))
    setUser(updated)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, initializing, login, completeGoogleLogin, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
