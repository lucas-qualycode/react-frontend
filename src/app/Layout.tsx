import { Outlet } from 'react-router-dom'
import { Toolbar } from '@/app/components/Toolbar'
import { ScreenLoader } from '@/app/components/ScreenLoader'

export function Layout() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-[var(--bg)]">
      <Toolbar />
      <main className="flex-1 w-full">
        <Outlet />
      </main>
      <ScreenLoader />
    </div>
  )
}
