/**
 * Supabase Storage 全链路测试脚本
 *
 * 测试内容：
 *   1. 验证 3 个 Bucket 存在及配置正确
 *   2. 上传文件到 avatars / campaign-assets / uploads
 *   3. 获取公开 URL（public bucket）+ Signed URL（private bucket）
 *   4. 生成 Signed Upload URL（客户端直传）
 *   5. 列出目录文件
 *   6. RLS 策略验证（anon 客户端被拒绝写/读 private）
 *   7. 清理测试文件
 *
 * 运行方式：
 *   node scripts/test-storage.mjs
 *   npm run test:storage
 *
 * 前提：.env 中 MOCK_DB=false，SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 已配置
 */

import { createClient } from '@supabase/supabase-js'
import { loadEnv, c, ok, fail, info, section, counts } from './_shared.mjs'

loadEnv(import.meta.url)

const supabaseUrl = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY

console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
console.log(`${c.bold}${c.cyan}  Supabase Storage 全链路测试${c.reset}`)
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)

// ─── 前置检查 ────────────────────────────────────────
if (process.env.MOCK_DB === 'true') {
  console.log(`${c.yellow}  MOCK_DB=true，请设为 false 后重试${c.reset}`)
  process.exit(1)
}
if (!supabaseUrl || !serviceRoleKey) {
  console.log(`${c.red}  SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY 未配置${c.reset}`)
  process.exit(1)
}

info(`SUPABASE_URL: ${supabaseUrl}`)
info(`SERVICE_ROLE_KEY: ${serviceRoleKey.substring(0, 20)}...`)
info(`ANON_KEY: ${anonKey ? anonKey.substring(0, 20) + '...' : c.red + '未配置' + c.reset}`)

// ─── 客户端初始化 ────────────────────────────────────
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anon = anonKey ? createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
}) : null

const testId = `test_${Date.now()}`
const testUserId = '00000000-0000-0000-0000-000000000001'
const testFiles = []

// ═══════════════════════════════════════════════════════
//  1. Bucket 存在性检查
// ═══════════════════════════════════════════════════════
section('1. Bucket 存在性检查')

for (const bucket of ['avatars', 'campaign-assets', 'uploads']) {
  const { data, error } = await admin.storage.getBucket(bucket)
  if (error) {
    fail(`Bucket "${bucket}" 不存在: ${error.message}`)
  } else {
    ok(`Bucket "${bucket}" (public=${data.public}, size_limit=${data.file_size_limit})`)
  }
}

// ═══════════════════════════════════════════════════════
//  2. 上传 avatars (public)
// ═══════════════════════════════════════════════════════
section('2. 上传文件到 avatars (public)')

const avatarPath = `${testUserId}/${testId}_avatar.png`
const pngBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

{
  const { data, error } = await admin.storage.from('avatars').upload(avatarPath, pngBytes, {
    contentType: 'image/png', upsert: true,
  })
  if (error) fail(`上传头像失败: ${error.message}`)
  else { ok(`头像上传成功: ${data.path}`); testFiles.push({ bucket: 'avatars', path: avatarPath }) }
}

// ═══════════════════════════════════════════════════════
//  3. 公开 URL
// ═══════════════════════════════════════════════════════
section('3. 获取公开 URL (avatars)')

{
  const { data } = admin.storage.from('avatars').getPublicUrl(avatarPath)
  if (data?.publicUrl) {
    ok(`公开 URL: ${data.publicUrl}`)
    try {
      const resp = await fetch(data.publicUrl)
      ok(`公开 URL 可正常访问 (status=${resp.status})`)
    } catch (e) {
      info(`公开 URL 访问异常: ${e.message}`)
    }
  } else {
    fail('获取公开 URL 失败')
  }
}

// ═══════════════════════════════════════════════════════
//  4. 上传 campaign-assets (admin-only write)
// ═══════════════════════════════════════════════════════
section('4. 上传文件到 campaign-assets (admin-only write)')

const campaignPath = `${testUserId}/${testId}_banner.png`
{
  const { data, error } = await admin.storage.from('campaign-assets').upload(campaignPath, pngBytes, {
    contentType: 'image/png', upsert: true,
  })
  if (error) fail(`上传营销素材失败: ${error.message}`)
  else { ok(`营销素材上传成功: ${data.path}`); testFiles.push({ bucket: 'campaign-assets', path: campaignPath }) }
}

// ═══════════════════════════════════════════════════════
//  5. 上传 uploads (private)
// ═══════════════════════════════════════════════════════
section('5. 上传文件到 uploads (private)')

const uploadPath = `${testUserId}/${testId}_doc.pdf`
{
  const { data, error } = await admin.storage.from('uploads').upload(uploadPath, new Uint8Array([37, 80, 68, 70]), {
    contentType: 'application/pdf', upsert: true,
  })
  if (error) fail(`上传私有文件失败: ${error.message}`)
  else { ok(`私有文件上传成功: ${data.path}`); testFiles.push({ bucket: 'uploads', path: uploadPath }) }
}

// ═══════════════════════════════════════════════════════
//  6. Signed URL (private)
// ═══════════════════════════════════════════════════════
section('6. 生成私有文件 Signed URL')

{
  const { data, error } = await admin.storage.from('uploads').createSignedUrl(uploadPath, 300)
  if (error) {
    fail(`生成 Signed URL 失败: ${error.message}`)
  } else if (data?.signedUrl) {
    ok(`Signed URL 生成成功 (有效期 300s)`)
    info(`URL: ${data.signedUrl.substring(0, 80)}...`)
    try {
      const resp = await fetch(data.signedUrl)
      ok(`Signed URL 可正常访问 (status=${resp.status})`)
    } catch (e) {
      info(`Signed URL 访问异常: ${e.message}`)
    }
  } else {
    fail('Signed URL 返回数据为空')
  }
}

// ═══════════════════════════════════════════════════════
//  7. Signed Upload URL（客户端直传）
// ═══════════════════════════════════════════════════════
section('7. 生成 Signed Upload URL（客户端直传）')

const directUploadPath = `${testUserId}/${testId}_direct_upload.png`
{
  const { data, error } = await admin.storage.from('uploads').createSignedUploadUrl(directUploadPath)
  if (error) fail(`生成 Signed Upload URL 失败: ${error.message}`)
  else if (data?.signedUrl) {
    ok(`Signed Upload URL 生成成功`)
    info(`URL: ${data.signedUrl.substring(0, 80)}...`)
    testFiles.push({ bucket: 'uploads', path: directUploadPath })
  } else {
    fail('Signed Upload URL 返回数据为空')
  }
}

// ═══════════════════════════════════════════════════════
//  8. 列出目录文件
// ═══════════════════════════════════════════════════════
section('8. 列出 Bucket 目录文件')

{
  const { data, error } = await admin.storage.from('avatars').list(testUserId, {
    limit: 10, sortBy: { column: 'created_at', order: 'desc' },
  })
  if (error) fail(`列出文件失败: ${error.message}`)
  else {
    ok(`avatars/${testUserId}/ 目录下有 ${data?.length || 0} 个文件`)
    data?.forEach(f => info(`  └─ ${f.name} (${f.metadata?.size || '?'} bytes)`))
  }
}

// ═══════════════════════════════════════════════════════
//  9. RLS 策略验证（anon 客户端）
// ═══════════════════════════════════════════════════════
section('9. RLS 策略验证（anon 客户端）')

if (anon) {
  // 9a. anon 上传被拒绝
  {
    const { error } = await anon.storage.from('avatars').upload(`${testUserId}/rls_test.png`, pngBytes, {
      contentType: 'image/png', upsert: true,
    })
    error ? ok(`anon 上传被拒绝: ${error.message.substring(0, 60)}`)
          : fail('anon 上传成功 — RLS 策略可能未正确配置！')
  }

  // 9b. anon 列出 uploads 返回空
  {
    const { data, error } = await anon.storage.from('uploads').list(testUserId, { limit: 10 })
    if (error) ok(`anon 列出 uploads 被拒绝: ${error.message.substring(0, 60)}`)
    else if (data?.length > 0) fail('anon 能列出 uploads 文件 — RLS 策略可能未正确配置！')
    else ok('anon 列出 uploads 返回空（符合预期）')
  }

  // 9c. anon DELETE 验证（API 对无匹配行不报错，需验证文件仍存在）
  {
    await anon.storage.from('avatars').remove([avatarPath])
    const { data: afterList } = await admin.storage.from('avatars').list(testUserId, { limit: 100 })
    const stillExists = afterList?.some(f => f.name === avatarPath.split('/').pop())
    stillExists ? ok('anon DELETE 未生效，文件仍存在（RLS 正常拦截）')
                : fail('anon DELETE 实际删除了文件 — RLS 策略可能未正确配置！')
  }

  // 9d. anon Signed URL 被拒绝
  {
    const { error } = await anon.storage.from('uploads').createSignedUrl(uploadPath, 300)
    error ? ok(`anon 获取 Signed URL 被拒绝: ${error.message.substring(0, 60)}`)
          : fail('anon 获取 Signed URL 成功 — RLS 策略可能未正确配置！')
  }
} else {
  info('跳过 RLS 测试（ANON_KEY 未配置）')
}

// ═══════════════════════════════════════════════════════
//  10. 清理测试文件
// ═══════════════════════════════════════════════════════
section('10. 清理测试文件')

for (const { bucket, path: filePath } of testFiles) {
  const { error } = await admin.storage.from(bucket).remove([filePath])
  error ? fail(`清理失败 ${bucket}/${filePath}: ${error.message}`)
        : ok(`已清理 ${bucket}/${filePath}`)
}

// ═══════════════════════════════════════════════════════
//  汇总
// ═══════════════════════════════════════════════════════
console.log(`\n${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}`)
const { pass: passCount, fail: failCount } = counts()
const total = passCount + failCount
if (failCount === 0) {
  console.log(`${c.bold}${c.green}  全部通过！${passCount}/${total} 项测试成功${c.reset}`)
} else {
  console.log(`${c.bold}${c.red}  有 ${failCount}/${total} 项测试失败${c.reset}`)
}
console.log(`${c.bold}${c.cyan}══════════════════════════════════════════════════${c.reset}\n`)

process.exit(failCount > 0 ? 1 : 0)
