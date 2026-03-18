import { useParams } from 'react-router-dom'
import { Layout, Typography } from 'antd'

const { Content } = Layout
const { Title, Text } = Typography

export function InvitationViewPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <Content style={{ padding: 32, maxWidth: 1152, margin: '0 auto', width: '100%' }}>
      <Title level={2}>Invitation</Title>
      <Text type="secondary">Invitation id: {id}</Text>
    </Content>
  )
}
