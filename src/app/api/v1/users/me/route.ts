import { auth } from '@clerk/nextjs/server'
import db from '@/lib/db'
import { ok, err } from '@/lib/response'
import { resolveUserId, findUserById } from '@/lib/services/clerk.service'
import {
  UpdateUserSchema,
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

// ------------------------------------------------------------
//  PATCH /api/users/me
//  Body: { first_name?, last_name?, avatar_id? }
// ------------------------------------------------------------
export async function PATCH(req: Request) {
  const { userId: clerkId } = await auth()
  if (!clerkId) return err('Unauthorized', 401)

  const body   = await req.json()
  const parsed = UpdateUserSchema.safeParse(body)
  if (!parsed.success) {
    return err(parsed.error.flatten().fieldErrors as unknown as string, 400)
  }

  const { first_name, last_name, avatar_id } = parsed.data

  try {
    const userId = await resolveUserId(clerkId)
    if (!userId) return err('User not found', 404)

    if (avatar_id !== undefined) {
      const avatarCheck = await db.query(
        `SELECT 1
         FROM avatars
         WHERE avatar_id = $1
           AND is_active = TRUE
         LIMIT 1`,
        [avatar_id]
      )

      if (!avatarCheck.rows[0]) {
        return err('Avatar not found or inactive', 400)
      }
    }

    const result = await db.query(
      `UPDATE users
       SET
         first_name = COALESCE($1, first_name),
         last_name  = COALESCE($2, last_name),
         avatar_id  = COALESCE($3, avatar_id),
         updated_at = NOW()
       WHERE user_id    = $4
         AND deleted_at IS NULL
       RETURNING
         user_id, email, first_name, last_name,
         role, status, created_at, updated_at, avatar_id`,
      [first_name ?? null, last_name ?? null, avatar_id ?? null, userId]
    )

    if (!result.rows[0]) return err('User not found', 404)

    const updated = await findUserById(userId)
    if (!updated) return err('User not found', 404)

    return ok(updated)
  } catch (error) {
    console.error('[PATCH /users/me]', error)
    return err('Internal server error', 500)
  }
}

// ------------------------------------------------------------
//  DELETE /api/users/me
//  Soft delete: deleted_at + status = INACTIVE
// ------------------------------------------------------------
export async function DELETE() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return err('Unauthorized', 401)

  try {
    const userId = await resolveUserId(clerkId)
    if (!userId) return err('User not found', 404)

    await db.query(
      `UPDATE users
       SET deleted_at = NOW(),
           status     = 'INACTIVE'
       WHERE user_id    = $1
         AND deleted_at IS NULL`,
      [userId]
    )

    return ok({ deleted: true, user_id: userId })
  } catch (error) {
    console.error('[DELETE /users/me]', error)
    return err('Internal server error', 500)
  }
}