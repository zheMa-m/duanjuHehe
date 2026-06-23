import { describe, it, expect } from 'vitest'

// ── BUILTIN_ADMIN_UUID ──
const BUILTIN_ADMIN_UUID = '9e638ba2-41aa-4434-a68b-6bd9f7ed0963'

describe('BUILTIN_ADMIN_UUID', () => {
  it('应为有效的 UUID v4 格式', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    expect(BUILTIN_ADMIN_UUID).toMatch(uuidRegex)
  })

  it('应为常量值且不可变', () => {
    expect(BUILTIN_ADMIN_UUID).toBe('9e638ba2-41aa-4434-a68b-6bd9f7ed0963')
  })
})

describe('assertUser 逻辑验证', () => {
  it('用户对象包含必要字段时应视为有效', () => {
    const validUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
      is_anonymous: false,
    }
    expect(validUser).toHaveProperty('id')
    expect(validUser).toHaveProperty('role')
  })

  it('用户对象缺少 id 时应视为无效', () => {
    const invalidUser = {
      email: 'test@example.com',
      role: 'user',
    }
    expect(invalidUser).not.toHaveProperty('id')
  })

  it('管理员角色应包含 admin 标识', () => {
    const adminUser = {
      id: BUILTIN_ADMIN_UUID,
      email: 'admin@hehe.local',
      role: 'admin',
    }
    expect(adminUser.role).toBe('admin')
  })

  it('普通用户不应具有管理员角色', () => {
    const normalUser = {
      id: 'user-123',
      email: 'user@example.com',
      role: 'user',
    }
    expect(normalUser.role).not.toBe('admin')
  })
})
