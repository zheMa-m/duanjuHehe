/**
 * 语言自动检测 Composable
 *
 * 优先级：URL 路径 > Cookie > 浏览器语言 > IP 归属 > 默认中文
 */

const ZH_LOCALES = ['zh', 'zh-cn', 'zh-tw', 'zh-hk', 'zh-sg']

/**
 * 判断语言代码是否属于中文
 */
function isChineseLocale(langCode: string): boolean {
  const base = langCode.toLowerCase().split('-')[0] || ''
  return ZH_LOCALES.includes(base)
}

/**
 * 从浏览器 navigator.language 检测语言
 */
function detectBrowserLanguage(): 'zh' | 'en' {
  if (import.meta.server) return 'zh'

  const navLang = navigator.language || ''
  const navLangs = navigator.languages || []

  // 优先检查 navigator.language
  if (navLang && isChineseLocale(navLang)) return 'zh'

  // 再检查 navigator.languages 列表
  for (const lang of navLangs) {
    if (isChineseLocale(lang)) return 'zh'
  }

  return 'en'
}

/**
 * 从 Intl 时区推断地区
 * 返回 'zh' 表示中国时区，null 表示非中国时区
 */
function detectTimezoneLocale(): 'zh' | null {
  if (import.meta.server) return null
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    // 中国时区
    if (tz.startsWith('Asia/Shanghai') || tz.startsWith('Asia/Chongqing') || tz.startsWith('Asia/Hong_Kong') || tz.startsWith('Asia/Taipei') || tz.startsWith('Asia/Macau')) {
      return 'zh'
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * 综合语言检测
 */
export function useLocaleDetect() {
  const { locale, setLocale, locales } = useI18n()

  /** 当前语言代码 */
  const currentLocale = computed(() => locale.value)

  /** 是否为中文 */
  const isZh = computed(() => locale.value === 'zh')

  /** 是否为英文 */
  const isEn = computed(() => locale.value === 'en')

  /** 可用语言列表 */
  const availableLocales = computed(() => locales.value)

  /**
   * 自动检测并设置语言
   * 在 onMounted 中调用
   */
  const autoDetect = () => {
    // 如果已有 cookie/URL 设定的语言，不覆盖
    if (locale.value && locale.value !== 'zh') return

    // 浏览器语言检测
    const browserLang = detectBrowserLanguage()
    if (browserLang !== 'zh') {
      setLocale('en')
      return
    }

    // 时区推断：非中国时区则切换英文
    const tzLang = detectTimezoneLocale()
    if (tzLang === null) {
      setLocale('en')
      return
    }

    // 默认中文
  }

  /**
   * 切换语言
   */
  const toggleLocale = () => {
    setLocale(locale.value === 'zh' ? 'en' : 'zh')
  }

  /**
   * 显示名称
   */
  const localeLabel = computed(() => locale.value === 'zh' ? '中文' : 'EN')

  return {
    locale: currentLocale,
    isZh,
    isEn,
    availableLocales,
    autoDetect,
    toggleLocale,
    setLocale,
    localeLabel,
  }
}
