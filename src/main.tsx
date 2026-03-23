import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/app/auth/AuthContext'
import { AppearanceThemeProvider } from '@/app/AppearanceThemeProvider'
import { router } from '@/app/routes'
import './index.css'

const queryClient = new QueryClient()

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
