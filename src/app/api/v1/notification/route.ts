import { auth } from '@clerk/nextjs/server'
import db from '@/lib/db'
import { ok, err } from '@/lib/response'
import { resolveUserId } from '@/lib/services/clerk.service'
import { NotificationResponseSchema } from '@/lib/schemas/notification.schema'
import { z } from 'zod'

// ------------------------------------------------------------
//  GET /api/notifications
//  Lista las notificaciones del usuario
//  Query params: ?status=PENDING|SENT|FAILED|CANCELLED
// ------------------------------------------------------------
export async function GET(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return err('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'PENDING'

  const StatusSchema = z.enum(['PENDING', 'SENT', 'FAILED', 'CANCELLED'])
  const parsedStatus = StatusSchema.safeParse(status)
  if (!parsedStatus.success) return err('Invalid status filter', 400)

  try {
    const userId = await resolveUserId(clerkId)
    if (!userId) return err('User not found', 404)

    const result = await db.query(
      `SELECT
         notification_id,
         user_id,
         notification_type,
         subject,
         status,
         scheduled_for,
         sent_at,
         retry_count,
         related_entity_type,
         related_entity_id,
         created_at
       FROM email_notifications
       WHERE user_id = $1
         AND status  = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [userId, parsedStatus.data]
    )

    const notifications = z.array(NotificationResponseSchema).parse(result.rows)
    return ok(notifications)

  } catch (error) {
    console.error('[GET /notifications]', error)
    return err('Internal server error', 500)
  }
}