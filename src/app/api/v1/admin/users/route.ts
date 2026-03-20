import { NextRequest } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ok, err } from '@/lib/response'
import { requireAdmin } from '@/lib/services/admin.service'
import db from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return err('No autorizado', 401)

    const adminId = await requireAdmin(userId)
    if (!adminId) return err('Forbidden', 403)

    const { searchParams } = new URL(req.url)
    const page   = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20')))
    const search = searchParams.get('search') ?? ''
    const offset = (page - 1) * limit

    const result = await db.query(
      `SELECT
         u.user_id, u.email, u.first_name, u.last_name,
         u.role, u.status, u.created_at,
         COUNT(t.trip_id) AS total_trips,
         ui.provider,
         COUNT(*) OVER() AS total_count
       FROM users u
       LEFT JOIN trips t ON t.user_id = u.user_id
       LEFT JOIN user_identities ui ON ui.user_id = u.user_id
       WHERE u.deleted_at IS NULL
         AND ($1 = '' OR u.email      ILIKE '%' || $1 || '%'
              OR u.first_name ILIKE '%' || $1 || '%'
              OR u.last_name  ILIKE '%' || $1 || '%')
       GROUP BY u.user_id, ui.provider
       ORDER BY u.created_at DESC
       LIMIT $2 OFFSET $3`,
      [search, limit, offset]
    )

    const total = parseInt(result.rows[0]?.total_count ?? '0')
    const users = result.rows.map(({ total_count, ...r }) => r)
    return ok({ users, total, page, limit })
  } catch (e: any) {
    return err(e.message, 500)
  }
}
