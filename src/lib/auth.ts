const TOKEN_KEY = 'dompet_admin_token'
const ROLE_KEY = 'dompet_admin_role'
const USERNAME_KEY = 'dompet_admin_username'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const getRole = () => localStorage.getItem(ROLE_KEY)
export const getUsername = () => localStorage.getItem(USERNAME_KEY)

export const setAuth = (token: string, role: string, username: string) => {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ROLE_KEY, role)
  localStorage.setItem(USERNAME_KEY, username)
}

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(USERNAME_KEY)
}

export const isAuthenticated = () => !!getToken()
