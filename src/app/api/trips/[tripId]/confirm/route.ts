import { auth } from '@clerk/nextjs/server'
import db from '@/lib/db'
import { ok, err } from '@/lib/response'
import { resolveUserId } from '@/lib/services/clerk.service'

type Params = { params: Promise<{ tripId: string }> }

async function changeStatus(tripId: string, clerkId: string, action: 'CONFIRM' | 'CANCEL' | 'COMPLETE') {
  const userId = await resolveUserId(clerkId)
  if (!userId) return err('User not found', 404)

  const result = await db.query<{ fn_change_trip_status: string }>(
    `SELECT fn_change_trip_status($1, $2, $3) AS new_status`,
    [tripId, userId, action]
  )

  return ok({ new_status: result.rows[0].fn_change_trip_status, trip_id: tripId })
}

// ------------------------------------------------------------
//  POST /api/trips/[tripId]/confirm
// ------------------------------------------------------------
export async function POST(_req: Request, { params }: Params) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return err('Unauthorized', 401)

  const { tripId } = await params

  try {
    return await changeStatus(tripId, clerkId, 'CONFIRM')
  } catch (error: unknown) {
    console.error('[POST /trips/:tripId/confirm]', error)
    if (error instanceof Error) {
      if (error.message.includes('not found or access denied')) return err('Trip not found', 404)
      if (error.message.includes('Only DRAFT'))                 return err(error.message, 400)
    }
    return err('Internal server error', 500)
  }
}