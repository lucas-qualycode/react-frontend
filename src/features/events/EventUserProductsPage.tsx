import { useParams } from 'react-router-dom'
import { Layout, Typography } from 'antd'

const { Content } = Layout
const { Title, Text } = Typography

export function EventUserProductsPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Title level={2}>User products</Title>
      <Text type="secondary">Event id: {id}</Text>
    </Content>
  )
}
