/**
 * 智能问卷静态数据 — 直接定义，不走 vue-i18n 编译
 * 避免 vue-i18n v11 将数组编译为 AST 节点
 *
 * 包含：
 *   - intro/focus/goal/relationship/calculating 选项
 *   - 问卷问题选项（q1~q18）
 */

export type StarpathLang = 'zh' | 'en'

// ── intro 阶段选项 ──────────────────────────────────

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

export function getStarpathIntroData(lang: StarpathLang = 'zh') {
  return starpathIntroData[lang]
}

// ── 问卷问题选项 ──────────────────────────────────

export const questionOptions = {
  zh: {
    q1_options: ['充满活力', '勉强维持', '完全迷茫'],
    q2_options: ['听从直觉', '理性分析', '寻求他人建议', '拖延回避'],
    q3_options: ['创造性表达', '深度连接', '学习成长', '帮助他人'],
    q4_options: ['社交流畅', '选择性社交', '内向安静', '看心情'],
    q5_options: ['沟通不畅', '信任问题', '边界模糊', '情感表达'],
    q6_options: ['追求梦想', '稳定发展', '寻求转变', '探索中'],
    q7_options: ['从容丰盛', '努力积累', '偶尔焦虑', '随缘态度'],
    q8_options: ['运动发泄', '冥想放松', '与人倾诉', '自我消化'],
    q9_options: ['爱与关系', '成就与事业', '自由与冒险', '和平与稳定'],
    q10_options: ['相信宿命', '相信自由意志', '两者都有', '不确定'],
    q11_options: ['终身学习者', '顺其自然', '需要时再学', '已被生活填满'],
    q12_options: ['领导者', '协作者', '智囊团', '执行者'],
    q13_options: ['人际关系', '工作压力', '内在状态', '外界环境'],
    q14_options: ['充满好奇', '谨慎尝试', '观望跟随', '偏好熟悉'],
    q15_options: ['事业成就', '感情幸福', '内心平静', '身体健康'],
    q16_options: ['非常信任', '偶尔参考', '需要验证', '不太信任'],
    q17_options: ['享受当下', '创造价值', '积累体验', '守护所爱'],
    q18_options: ['方向指引', '自我认知', '情感慰藉', '趣味体验'],
  },
  en: {
    q1_options: ['Thriving', 'Just getting by', 'Completely lost'],
    q2_options: ['Follow intuition', 'Rational analysis', 'Seek advice', 'Procrastinate'],
    q3_options: ['Creative expression', 'Deep connection', 'Learning & growth', 'Helping others'],
    q4_options: ['Social butterfly', 'Selective socializer', 'Quiet introvert', 'Depends on mood'],
    q5_options: ['Communication', 'Trust issues', 'Boundaries', 'Emotional expression'],
    q6_options: ['Pursuing passion', 'Stable growth', 'Seeking change', 'Exploring'],
    q7_options: ['Abundant', 'Building steadily', 'Occasionally anxious', 'Laid back'],
    q8_options: ['Exercise', 'Meditation', 'Talk it out', 'Keep to myself'],
    q9_options: ['Love & relationships', 'Achievement & career', 'Freedom & adventure', 'Peace & stability'],
    q10_options: ['Fate', 'Free will', 'Both', 'Not sure'],
    q11_options: ['Lifelong learner', 'Go with the flow', 'As needed', 'Life is already full'],
    q12_options: ['Leader', 'Collaborator', 'Brain trust', 'Executor'],
    q13_options: ['Relationships', 'Work pressure', 'Inner state', 'External environment'],
    q14_options: ['Curious', 'Cautious', 'Wait and see', 'Prefer familiar'],
    q15_options: ['Career success', 'Relationship happiness', 'Inner peace', 'Health & fitness'],
    q16_options: ['Trust it fully', 'Occasionally consult it', 'Need verification', "Don't trust it"],
    q17_options: ['Enjoy the moment', 'Create value', 'Gather experiences', 'Protect loved ones'],
    q18_options: ['Direction & guidance', 'Self-awareness', 'Emotional comfort', 'Fun experience'],
  },
} as const

export function getQuestionOptions(qid: number, lang: StarpathLang = 'zh'): string[] {
  const key = `q${qid}_options`
  const langData = questionOptions[lang] as unknown as Record<string, string[]>
  return langData[key] || []
}

// ── 问卷题目文本（中英文） ──────────────────────────────────

export const questionTexts = {
  zh: {
    q1: '你对自己目前的人生方向满意吗？',
    q2: '面对重大决策时，你通常如何应对？',
    q3: '什么事能让你感到真正的活力？',
    q4: '你如何描述你的社交风格？',
    q5: '在关系中你最容易遇到什么挑战？',
    q6: '你目前的职业状态是？',
    q7: '你与金钱的关系是怎样的？',
    q8: '你通常如何处理压力？',
    q9: '你人生中最看重的是什么？',
    q10: '你相信宿命还是自由意志？',
    q11: '你如何看待个人成长？',
    q12: '在团队中你通常扮演什么角色？',
    q13: '什么最影响你的情绪？',
    q14: '你如何对待新事物？',
    q15: '你希望在哪方面获得突破？',
    q16: '你对自己的直觉怎么看？',
    q17: '你觉得人生中最重要的是？',
    q18: '你期待 AI 占星给你带来什么？',
  },
  en: {
    q1: 'How satisfied are you with the direction your life is taking?',
    q2: 'When facing major decisions, how do you usually respond?',
    q3: 'What makes you feel truly alive?',
    q4: 'How would you describe your social style?',
    q5: 'What challenge do you face most in relationships?',
    q6: 'What\'s your current career status?',
    q7: 'How would you describe your relationship with money?',
    q8: 'How do you usually handle stress?',
    q9: 'What matters most to you in life?',
    q10: 'Do you believe in fate or free will?',
    q11: 'How do you view personal growth?',
    q12: 'What role do you usually play in a team?',
    q13: 'What affects your mood the most?',
    q14: 'How do you approach new things?',
    q15: 'Which area do you want to break through in?',
    q16: 'How do you feel about your intuition?',
    q17: 'What do you think is most important in life?',
    q18: 'What do you hope AI astrology can bring you?',
  },
} as const

/** 获取题目文本（用于管理后台展示） */
export function getQuestionText(qid: number | string, lang: StarpathLang = 'zh'): string {
  const key = typeof qid === 'number' ? `q${qid}` : qid
  const langData = questionTexts[lang] as unknown as Record<string, string>
  return langData[key] || key
}
