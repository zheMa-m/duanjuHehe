import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({ scale: 1.2 }),
  ],
  theme: {
    colors: {
      brand: {
        primary: '#4f8ef7',
        secondary: '#8b5cf6',
        accent: '#6366f1',         // indigo-500, 管理后台主色调
        'accent-light': '#818cf8', // indigo-400
        'accent-dark': '#4f46e5',  // indigo-600
        'accent-soft': '#a5b4fc',  // indigo-300
        'blue-500': '#3b82f6',     // 渐变用蓝
        violet: '#bf5af2',         // 紫色强调
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        // Apple HIG 状态色（管理后台专用）
        'status-ok': '#30d158',
        'status-err': '#ff453a',
        'status-warn': '#ff9f0a',
        'status-info': '#bf5af2',
      },
      surface: {
        DEFAULT: '#0a0e1a',
        card: '#131d35',
        elevated: '#1a2540',
        border: '#1e2d4d',
      }
    },
    fontFamily: {
      sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
    }
  },
  shortcuts: {
    // Apple/Stripe 级别玻璃拟态卡片
    'glass-card': 'bg-white/5 backdrop-blur-md border border-white/10 shadow-lg rounded-2xl',
    // 高品质按钮（悬浮微上移 + 阴影增强）
    'btn-premium': 'bg-brand-primary hover:bg-brand-primary/90 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 shadow-md',
    // 危险操作按钮
    'btn-danger': 'bg-brand-danger/10 hover:bg-brand-danger/20 text-brand-danger border border-brand-danger/20 px-4 py-2 rounded-xl transition-all',
    // 通用 badge 标签
    'badge-blue': 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/15 text-brand-primary border border-brand-primary/25',
    'badge-green': 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-success/15 text-brand-success border border-brand-success/25',
    'badge-red': 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-danger/15 text-brand-danger border border-brand-danger/25',
  },
  safelist: [
    'glass-card',
    'btn-premium',
    'btn-danger',
    // 管理后台菜单图标（动态绑定，UnoCSS 静态扫描无法检测）
    'i-lucide-layout-dashboard',
    'i-lucide-shopping-bag',
    'i-lucide-clipboard-list',
    'i-lucide-receipt',
    'i-lucide-refresh-cw',
    'i-lucide-trending-up',
    'i-lucide-megaphone',
    'i-lucide-message-square',
    'i-lucide-users',
    'i-lucide-image',
    'i-lucide-shield',
    'i-lucide-activity',
    'i-lucide-settings',
    'i-lucide-file-text',
    'i-lucide-eye',
    'i-lucide-eye-off',
    // 主题切换器图标（动态绑定）
    'i-lucide-moon',
    'i-lucide-sun',
    'i-lucide-contrast',
    'i-lucide-monitor',
    // 媒体库工具栏图标（排序方向动态绑定）
    'i-lucide-arrow-down',
    'i-lucide-arrow-up',
  ]
})
