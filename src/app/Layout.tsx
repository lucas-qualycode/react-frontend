import { Outlet } from 'react-router-dom'
import { Layout as AntLayout } from 'antd'
import { AppHeader } from '@/app/components/AppHeader'
import { ScreenLoader } from '@/app/components/ScreenLoader'

const { Header, Content } = AntLayout

export function Layout() {
  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Header style={{ padding: 0, height: 'auto', lineHeight: 'normal' }}>
        <AppHeader />
      </Header>
      <Content style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Content>
      <ScreenLoader />
    </AntLayout>
  )
}
