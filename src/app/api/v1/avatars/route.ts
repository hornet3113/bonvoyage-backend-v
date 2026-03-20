import { auth } from '@clerk/nextjs/server'
import db from '@/lib/db'
import { ok, err } from '@/lib/response'
import { z } from 'zod'

const AvatarSchema = z.object({
  avatar_id: z.coerce.number().int().positive(),
  name: z.string(),
  image_url: z.string().url(),
  is_active: z.boolean(),
})

// ------------------------------------------------------------
//  GET /api/avatars
//  Lista avatares activos para selector de perfil
// ------------------------------------------------------------
export async function GET() {
  const { userId: clerkId } = await auth()
  if (!clerkId) return err('Unauthorized', 401)

  try {
    const result = await db.query(
      `SELECT avatar_id, name, image_url, is_active
       FROM avatars
       WHERE is_active = TRUE
       ORDER BY avatar_id ASC`
    )

    const avatars = z.array(AvatarSchema).parse(result.rows)
    return ok(avatars)
  } catch (error) {
    console.error('[GET /avatars]', error)
    return err('Internal server error', 500)
  }
}
