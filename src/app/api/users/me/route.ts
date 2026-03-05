import { auth } from '@clerk/nextjs/server'
import db from '@/lib/db'
import { ok, err } from '@/lib/response'
import { resolveUserId, findUserById } from '@/lib/services/clerk.service'
import {
  UpdateUserSchema,
  UserResponseSchema,
} from '@/lib/schemas/user.schema'

// ------------------------------------------------------------
//  GET /api/users/me
// ------------------------------------------------------------
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return err('Unauthorized', 401)

  try {
    const userId = await resolveUserId(clerkId)
    if (!userId) return err('User not found', 404)

    const user = await findUserById(userId)
    if (!user) return err('User not found', 404)

    return ok(user)
  } catch (error) {
    console.error('[GET /users/me]', error)
    return err('Internal server error', 500)
  }
}