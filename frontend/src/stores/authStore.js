import { create } from 'zustand'
import { apiRequest } from '../services/api'

const savedUserJson = localStorage.getItem('marilou_pos_user')
const initialUser = savedUserJson ? JSON.parse(savedUserJson) : null
const initialToken = localStorage.getItem('marilou_pos_token') || null

export const useAuthStore = create((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: Boolean(initialToken && initialUser),

  setSession: (token, user) => {
    localStorage.setItem('marilou_pos_token', token)
    localStorage.setItem('marilou_pos_user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },

  clearSession: () => {
    localStorage.removeItem('marilou_pos_token')
    localStorage.removeItem('marilou_pos_user')
    set({ token: null, user: null, isAuthenticated: false })
  },

  logout: async () => {
    try {
      await apiRequest('/logout', { method: 'POST' })
    } catch {
      // Ignore network/token errors during logout
    } finally {
      localStorage.removeItem('marilou_pos_token')
      localStorage.removeItem('marilou_pos_user')
      set({ token: null, user: null, isAuthenticated: false })
    }
  },
}))
