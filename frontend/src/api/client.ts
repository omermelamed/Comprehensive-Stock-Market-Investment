import axios from 'axios'

const client = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '',
  withCredentials: true,
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && !error.config?.url?.includes('/api/auth/')) {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default client
