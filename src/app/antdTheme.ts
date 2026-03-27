import type { ThemeConfig } from 'antd'
import { theme } from 'antd'

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#7c3aed',
    colorPrimaryHover: '#5311bc',
    colorError: '#dc2626',
    colorErrorHover: '#b91c1c',
    colorText: '#374151',
    colorTextSecondary: '#6b7280',
    colorTextHeading: '#111827',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#cdb4f8',
    colorBorder: '#e5e7eb',
    colorFillSecondary: '#f3f4f6',
    colorFillTertiary: '#e5e7eb',
    colorFillQuaternary: '#cdb4f8',
    borderRadius: 8,
    fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
  },
}

export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#7c3aed',
    colorPrimaryHover: '#5311bc',
    colorError: '#dc2626',
    colorErrorHover: '#b91c1c',
    colorText: '#9ca3af',
    colorTextSecondary: '#6b7280',
    colorTextHeading: '#f3f4f6',
    colorBgContainer: '#16171d',
    colorBgElevated: '#1f2028',
    colorBorder: '#2e303a',
    colorFillSecondary: '#2e303a',
    colorFillTertiary: '#3e404a',
    colorFillQuaternary: '#1f2028',
  },
  algorithm: theme.darkAlgorithm,
}
