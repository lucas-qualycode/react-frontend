import { Flex, Image, Typography } from 'antd'

const { Title, Text } = Typography

export function HomePage() {
  return (
    <Flex vertical align="center" gap={16} style={{ padding: 32, maxWidth: 1152, margin: '0 auto', paddingBottom: 32 }}>
      <Image
        src="/partiiu-logo.png"
        alt="Partiiu!"
        width={128}
        height={128}
        style={{ objectFit: 'contain', borderRadius: 8 }}
        preview={false}
      />
      <Title level={2}>Home</Title>
      <Text type="secondary">Partiiu! home.</Text>
    </Flex>
  )
}
