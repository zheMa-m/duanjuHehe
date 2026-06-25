/**
 * 智能问卷 问卷流转控制
 *
 * 业务流程线：
 *   welcome → intro/familiarity → intro/overview → intro/focus → intro/goal
 *   → intro/relationship → birth/date → birth/time → birth/city → profile
 *   → intro/alignment → questions/1..18 → loading → purchase → email → success
 *
 * 用 Pinia store 跨页面持久化用户答题数据；本 composable 只暴露下一步路由计算。
 *
 * 路由前缀统一为 /h5/starpath/
 */
const FLOW: string[] = [
  '/h5/starpath/welcome',
  '/h5/starpath/intro/familiarity',
  '/h5/starpath/intro/overview',
  '/h5/starpath/intro/focus',
  '/h5/starpath/intro/goal',
  '/h5/starpath/intro/relationship',
  '/h5/starpath/birth/date',
  '/h5/starpath/birth/time',
  '/h5/starpath/birth/city',
  '/h5/starpath/profile',
  '/h5/starpath/intro/alignment',
  '/h5/starpath/questions/1',
  '/h5/starpath/questions/2',
  '/h5/starpath/questions/3',
  '/h5/starpath/questions/4',
  '/h5/starpath/questions/5',
  '/h5/starpath/questions/6',
  '/h5/starpath/questions/7',
  '/h5/starpath/questions/8',
  '/h5/starpath/questions/9',
  '/h5/starpath/questions/10',
  '/h5/starpath/questions/11',
  '/h5/starpath/questions/12',
  '/h5/starpath/questions/13',
  '/h5/starpath/questions/14',
  '/h5/starpath/questions/15',
  '/h5/starpath/questions/16',
  '/h5/starpath/questions/17',
  '/h5/starpath/questions/18',
  '/h5/starpath/loading',
  '/h5/starpath/purchase',
  '/h5/starpath/email',
  '/h5/starpath/success',
]

function normalize(path: string): string {
  // Map platform-specific paths to unified flow nodes
  if (path.includes('/subscribe')) return '/h5/starpath/purchase'
  if (path.includes('/success')) return '/h5/starpath/success'
  return path
}

export function useStarpathFlow() {
  const route = useRoute()
  const router = useRouter()

  function progressOf(path: string = (route.path as string) || ''): number {
    const idx = FLOW.indexOf(normalize(path))
    if (idx < 0) return 0
    return Math.round(((idx + 1) / FLOW.length) * 100)
  }

  function next() {
    const idx = FLOW.indexOf(normalize((route.path as string) || ''))
    if (idx < 0 || idx >= FLOW.length - 1) return
    return router.push(encodeURI(FLOW[idx + 1]!))
  }

  function go(path: string) {
    return router.push(encodeURI(path))
  }

  return { progressOf, next, go, FLOW }
}
