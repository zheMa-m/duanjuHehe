// @api-auth: user
import { defineEventHandler, readValidatedBody } from 'h3'
import { z } from 'zod'
import { assertUser } from '~~/server/utils/auth'
import { getDB } from '~~/server/utils/db'
import { sendSuccess } from '~~/server/utils/response'

defineRouteMeta({
  openAPI: {
    tags: ['观看'],
    summary: '上报观看进度',
    requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { episode_id: { type: 'string' }, series_id: { type: 'string' }, progress_seconds: { type: 'integer' }, duration_seconds: { type: 'integer' }, completed: { type: 'boolean' } } } } } },
  } as any,
})

const progressSchema = z.object({
  episode_id: z.string(),
  series_id: z.string(),
  progress_seconds: z.number().int().min(0).default(0),
  duration_seconds: z.number().int().min(0).default(0),
  completed: z.boolean().default(false),
})

export default defineEventHandler(async (event) => {
  const user = assertUser(event)
  const db = getDB(event)
  const body = await readValidatedBody(event, progressSchema.parse)

  const { data: existing } = await db.from('user_watch_history').select('id').eq('user_id', user.id).eq('episode_id', body.episode_id).single()

  if (existing) {
    await db.from('user_watch_history').update({
      progress_seconds: body.progress_seconds,
      duration_seconds: body.duration_seconds,
      completed: body.completed,
      watched_at: new Date().toISOString(),
    }).eq('id', existing.id)
  } else {
    await db.from('user_watch_history').insert({
      user_id: user.id,
      episode_id: body.episode_id,
      series_id: body.series_id,
      progress_seconds: body.progress_seconds,
      duration_seconds: body.duration_seconds,
      completed: body.completed,
    })
  }

  return sendSuccess(event, { recorded: true }, 'Progress updated')
})
