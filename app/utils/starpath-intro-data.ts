/**
 * 智能问卷 intro/focus/goal/relationship/calculating 选项 — 直接定义，不走 vue-i18n 编译
 * 避免 vue-i18n v11 将数组编译为 AST 节点
 */

export const starpathIntroData = {
  zh: {
    familiarityOptions: ['非常了解', '了解一些', '不太了解', '完全不了解'],
    focusOptions: ['感情关系', '事业与财富', '个人成长', '家庭与社群', '健康与灵性', '综合运势'],
    goalOptions: ['找到灵魂伴侣', '事业突破', '探索人生方向', '财富增长', '突破自我限制'],
    relationshipOptions: ['单身', '恋爱中', '已婚', '复杂关系'],
    calculatingSteps: ['计算本命星盘位置', '解码行为模式', '分析感情与事业宫', '完成月度预测'],
    introFeatures: ['AI 出生星盘分析', '性格特征解码', '感情兼容性洞察', '关键机遇窗口'],
    subscribeFeatures: ['灵魂蓝图：通过本命盘分析破除事业阻碍', '黄金窗口：你财富与爱情的高峰日期', '阴影工作：打破自我破坏模式', '无限合盘：随时与任何人进行配对分析'],
  },
  en: {
    familiarityOptions: ['Very familiar', 'Somewhat familiar', 'Not very familiar', 'Not at all'],
    focusOptions: ['Love & Relationships', 'Career & Wealth', 'Personal Growth', 'Family & Community', 'Health & Spirituality', 'General Forecast'],
    goalOptions: ['Find Soulmate', 'Career Breakthrough', 'Explore Life Direction', 'Wealth Growth', 'Break Self-Limitations'],
    relationshipOptions: ['Single', 'In a relationship', 'Married', "It's complicated"],
    calculatingSteps: ['Calculating Natal Placements', 'Decoding Behavioral Patterns', 'Analyzing Relationship & Career Houses', 'Finalizing Your Monthly Forecast'],
    introFeatures: ['AI Birth Chart Analysis', 'Personality Traits Decoded', 'Relationship Compatibility Insights', 'Key Opportunity Windows'],
    subscribeFeatures: ['Soul Blueprint: Solve career blocks with natal analysis', 'Golden Window: Your peak dates for wealth & love', 'Shadow Work: Break self-sabotaging patterns', 'Unlimited Synastry: Match with anyone, anytime'],
  },
} as const

export type StarpathLang = 'zh' | 'en'

export function getStarpathIntroData(lang: StarpathLang = 'zh') {
  return starpathIntroData[lang]
}
