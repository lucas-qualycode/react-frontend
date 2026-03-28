import {
  CalendarOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  LinkOutlined,
  MailOutlined,
  ShoppingOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Card, Collapse, Flex, Image, Row, Col, theme, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthContext'

const { Title, Text, Paragraph } = Typography

const HOME_CONTACT_EMAIL = 'contato@partiiu.com'

export function HomePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { token } = theme.useToken()

  const featureItems = [
    { key: 'events', icon: CalendarOutlined },
    { key: 'schedules', icon: ClockCircleOutlined },
    { key: 'products', icon: ShoppingOutlined },
    { key: 'invites', icon: MailOutlined },
    { key: 'guests', icon: TeamOutlined },
    { key: 'guestExperience', icon: LinkOutlined },
  ] as const

  const faqItems = [
    { q: 'q1', a: 'a1' },
    { q: 'q2', a: 'a2' },
    { q: 'q3', a: 'a3' },
    { q: 'q4', a: 'a4' },
    { q: 'q5', a: 'a5' },
    { q: 'q6', a: 'a6' },
  ] as const

  const collapseItems = faqItems.map(({ q, a }, i) => ({
    key: String(i),
    label: t(`home.faq.${q}`),
    children: <Paragraph style={{ marginBottom: 0 }}>{t(`home.faq.${a}`)}</Paragraph>,
  }))

  const contactHref = `mailto:${HOME_CONTACT_EMAIL}?subject=${encodeURIComponent(t('home.footer.contactEmailSubject'))}`

  return (
    <main id="main-content">
      <Flex vertical style={{ width: '100%' }}>
        <section
          aria-labelledby="home-hero-heading"
          style={{
            background: `linear-gradient(165deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 45%, ${token.colorBgLayout} 100%)`,
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Flex
            vertical
            align="center"
            gap={32}
            style={{
              maxWidth: 1152,
              margin: '0 auto',
              padding: '48px 24px 56px',
            }}
          >
            <Row gutter={[32, 32]} align="middle" style={{ width: '100%' }}>
              <Col xs={24} lg={14}>
                <Flex vertical gap={20} align="flex-start" style={{ textAlign: 'left' }}>
                  <Flex align="center" gap={12}>
                    <HeartOutlined
                      style={{
                        fontSize: 28,
                        color: token.colorPrimary,
                      }}
                      aria-hidden
                    />
                    <Text strong style={{ color: token.colorPrimary, letterSpacing: 0.5 }}>
                      Partiiu
                    </Text>
                  </Flex>
                  <Title level={1} id="home-hero-heading" style={{ margin: 0, maxWidth: 640 }}>
                    {t('home.hero.title')}
                  </Title>
                  <Paragraph
                    type="secondary"
                    style={{
                      fontSize: token.fontSizeLG,
                      marginBottom: 0,
                      maxWidth: 560,
                    }}
                  >
                    {t('home.hero.subtitle')}
                  </Paragraph>
                  <Flex gap={12} wrap="wrap">
                    {user ? (
                      <Button type="primary" size="large" onClick={() => navigate('/user-events')}>
                        {t('home.hero.ctaSignedIn')}
                      </Button>
                    ) : (
                      <>
                        <Button type="primary" size="large" onClick={() => navigate('/signup')}>
                          {t('home.hero.ctaSignUp')}
                        </Button>
                        <Button size="large" onClick={() => navigate('/signin')}>
                          {t('home.hero.ctaSignIn')}
                        </Button>
                      </>
                    )}
                  </Flex>
                </Flex>
              </Col>
              <Col xs={24} lg={10}>
                <div
                  role="img"
                  aria-label={t('home.hero.imageAlt')}
                  style={{
                    borderRadius: token.borderRadiusLG * 2,
                    overflow: 'hidden',
                    minHeight: 240,
                    background: `linear-gradient(135deg, ${token.colorPrimary}22 0%, ${token.colorInfoBg} 50%, ${token.colorSuccessBg} 100%)`,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 40,
                  }}
                >
                  <Image
                    src="/partiiu-logo.png"
                    alt=""
                    width={140}
                    height={140}
                    preview={false}
                    style={{ objectFit: 'contain', opacity: 0.95 }}
                  />
                </div>
              </Col>
            </Row>
          </Flex>
        </section>

        <Flex
          vertical
          gap={64}
          style={{
            maxWidth: 1152,
            margin: '0 auto',
            width: '100%',
            padding: '56px 24px 48px',
          }}
        >
          <section aria-labelledby="home-value-heading">
            <Flex vertical gap={16} align="flex-start" style={{ maxWidth: 720 }}>
              <Title level={2} id="home-value-heading" style={{ margin: 0 }}>
                {t('home.value.title')}
              </Title>
              <Paragraph style={{ marginBottom: 0, fontSize: token.fontSizeLG }}>
                {t('home.value.body')}
              </Paragraph>
            </Flex>
          </section>

          <section aria-labelledby="home-features-heading">
            <Title level={2} id="home-features-heading" style={{ marginBottom: 24 }}>
              {t('home.features.title')}
            </Title>
            <Row gutter={[20, 20]}>
              {featureItems.map(({ key, icon: Icon }) => (
                <Col xs={24} sm={12} lg={8} key={key}>
                  <Card variant="borderless" styles={{ body: { paddingBlock: 20 } }}>
                    <Flex vertical gap={12}>
                      <Icon
                        style={{ fontSize: 26, color: token.colorPrimary }}
                        aria-hidden
                      />
                      <Title level={4} style={{ margin: 0, fontSize: token.fontSizeHeading4 }}>
                        {t(`home.features.${key}.title`)}
                      </Title>
                      <Text type="secondary">{t(`home.features.${key}.desc`)}</Text>
                    </Flex>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          <section aria-labelledby="home-steps-heading">
            <Title level={2} id="home-steps-heading" style={{ marginBottom: 24 }}>
              {t('home.steps.title')}
            </Title>
            <Row gutter={[24, 24]}>
              {(['step1', 'step2', 'step3'] as const).map((stepKey, index) => (
                <Col xs={24} md={8} key={stepKey}>
                  <Card>
                    <Flex vertical gap={12}>
                      <Text
                        strong
                        style={{
                          color: token.colorPrimary,
                          fontSize: token.fontSizeLG,
                        }}
                      >
                        {index + 1}
                      </Text>
                      <Title level={4} style={{ margin: 0 }}>
                        {t(`home.steps.${stepKey}.title`)}
                      </Title>
                      <Text type="secondary">{t(`home.steps.${stepKey}.desc`)}</Text>
                    </Flex>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          <section aria-labelledby="home-social-heading">
            <Card>
              <Flex vertical gap={8} align="flex-start">
                <Title level={3} id="home-social-heading" style={{ margin: 0 }}>
                  {t('home.social.title')}
                </Title>
                <Text type="secondary">{t('home.social.body')}</Text>
              </Flex>
            </Card>
          </section>

          <section aria-labelledby="home-faq-heading">
            <Title level={2} id="home-faq-heading" style={{ marginBottom: 16 }}>
              {t('home.faq.title')}
            </Title>
            <Collapse items={collapseItems} bordered={false} style={{ background: 'transparent' }} />
          </section>

          <section
            aria-labelledby="home-cta-heading"
            style={{
              marginTop: 8,
              padding: '40px 32px',
              borderRadius: token.borderRadiusLG * 2,
              background: token.colorPrimaryBg,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex vertical gap={16} align="center" style={{ textAlign: 'center' }}>
              <Title level={3} id="home-cta-heading" style={{ margin: 0 }}>
                {t('home.ctaBand.title')}
              </Title>
              <Text type="secondary" style={{ maxWidth: 480 }}>
                {t('home.ctaBand.subtitle')}
              </Text>
              <Flex gap={12} wrap="wrap" justify="center">
                {user ? (
                  <Button type="primary" size="large" onClick={() => navigate('/user-events')}>
                    {t('home.hero.ctaSignedIn')}
                  </Button>
                ) : (
                  <>
                    <Button type="primary" size="large" onClick={() => navigate('/signup')}>
                      {t('home.ctaBand.primary')}
                    </Button>
                    <Button size="large" onClick={() => navigate('/signin')}>
                      {t('home.ctaBand.secondary')}
                    </Button>
                  </>
                )}
              </Flex>
            </Flex>
          </section>

          <footer
            style={{
              marginTop: 24,
              paddingTop: 32,
              borderTop: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex
              vertical
              gap={16}
              align="center"
              style={{ textAlign: 'center' }}
            >
              <Flex gap={24} wrap="wrap" justify="center">
                {!user && (
                  <>
                    <Link to="/signin">{t('home.footer.signIn')}</Link>
                    <Link to="/signup">{t('home.footer.signUp')}</Link>
                  </>
                )}
                <Typography.Link href={contactHref}>{t('home.footer.contact')}</Typography.Link>
              </Flex>
              <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                © {new Date().getFullYear()} Partiiu. {t('home.footer.rights')}
              </Text>
            </Flex>
          </footer>
        </Flex>
      </Flex>
    </main>
  )
}
