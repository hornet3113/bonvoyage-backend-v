import { auth } from '@clerk/nextjs/server'
import db from '@/lib/db'
import { ok, err } from '@/lib/response'
import { resolveUserId } from '@/lib/services/clerk.service'
import { UpdateNotificationSchema } from '@/lib/schemas/notification.schema'

type Params = { params: Promise<{ notifId: string }> }

// ------------------------------------------------------------
//  PATCH /api/notifications/[notifId]
//  Cancela una notificación pendiente
//  Body: { status: 'CANCELLED' }
// ------------------------------------------------------------
export async function PATCH(req: Request, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return err('Unauthorized', 401)

  const { notifId } = await params
  const body         = await req.json()
  const parsed       = UpdateNotificationSchema.safeParse(body)
  if (!parsed.success) {
    return err(parsed.error.flatten().fieldErrors as unknown as string, 400)
  }

  try {
    const userId = await resolveUserId(clerkId)
    if (!userId) return err('User not found', 404)

    const result = await db.query(
      `UPDATE email_notifications
       SET status = $1
       WHERE notification_id = $2
         AND user_id         = $3
         AND status          = 'PENDING'
       RETURNING notification_id, status`,
      [parsed.data.status, notifId, userId]
    )

    if (!result.rows[0]) {
      return err('Notification not found or already processed', 404)
    }

    return ok(result.rows[0])

  } catch (error) {
    console.error('[PATCH /notifications/:notifId]', error)
    return err('Internal server error', 500)
  }
}