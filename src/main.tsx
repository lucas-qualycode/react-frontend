import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import '@/i18n/config'
import { AuthProvider } from '@/app/auth/AuthContext'
import { AppearanceThemeProvider } from '@/app/AppearanceThemeProvider'
import { createAppRouter } from '@/app/routes/index'
import './index.css'

const queryClient = new QueryClient()
const router = createAppRouter(queryClient)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppearanceThemeProvider>
          <RouterProvider router={router} />
        </AppearanceThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
