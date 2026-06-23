/**
 * StarPath 问卷问题选项 — 直接定义，不走 vue-i18n 编译
 * 避免 vue-i18n v11 将数组编译为 AST 节点
 */

export const questionOptions: Record<string, string[]> = {
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

export function getQuestionOptions(qid: number, lang: 'zh' | 'en' = 'zh'): string[] {
  const key = `q${qid}_options`
  const langData = questionOptions[lang] as Record<string, string[]>
  return langData[key] || []
}
