import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from '@/app/Layout'
import { Protected, SuspensePage } from './shell'
import { getAuthRoutes } from './authRoutes'
import { getEventsRoutes } from './eventsRoutes'
import { getHomeRoute } from './homeRoute'
import { getSettingsRoutes } from './settingsRoutes'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      getHomeRoute(SuspensePage),
      ...getAuthRoutes(SuspensePage),
      ...getEventsRoutes(Protected),
      ...getSettingsRoutes(Protected),
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
