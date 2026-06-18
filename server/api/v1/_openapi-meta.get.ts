// @api-auth: public
/**
 * 此路由仅用于注入 OpenAPI 全局元数据（x-tagGroups）
 * Scalar 会读取 x-tagGroups 在侧边栏渲染两级折叠分组
 */

defineRouteMeta({
  openAPI: {
    tags: ['内部'],
    summary: 'OpenAPI 元数据',
    $global: {
      'x-tagGroups': [
        {
          name: '管理后台',
          tags: [
            '管理·运营-任务', '管理·运营-订单', '管理·运营-收入',
            '管理·营销-活动', '管理·营销-用户', '管理·营销-媒体库',
            '管理·系统-安全', '管理·系统-监控', '管理·系统-审计',
            '管理·系统-认证', '管理·系统-个人',
          ],
        },
        {
          name: '公共 API',
          tags: [
            '认证', '支付', '商品', '任务', '存储',
            '营销活动', '反馈', '订单', '用户',
          ],
        },
      ],
    },
  } as any,
})

export default defineEventHandler(() => ({}))
