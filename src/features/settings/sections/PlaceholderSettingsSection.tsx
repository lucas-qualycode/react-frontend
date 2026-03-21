import { Card, Typography } from 'antd'

const { Text } = Typography

export function PlaceholderSettingsSection({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card title={title}>
      <Text type="secondary">{description}</Text>
    </Card>
  )
}
