import { useLocation } from 'react-router-dom'
import { Layout, Typography } from 'antd'

const { Content } = Layout
const { Title, Text } = Typography

export function PlaceholderPage({ title }: { title?: string }) {
  const location = useLocation()
  const name = title ?? (location.pathname || 'Page')
  return (
    <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Title level={2}>{name}</Title>
      <Text type="secondary">Placeholder for this route.</Text>
    </Content>
  )
}
