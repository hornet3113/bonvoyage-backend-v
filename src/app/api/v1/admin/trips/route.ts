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
    const page   = Math.max(1, parseInt(searchParams.get('page')   ?? '1'))
    const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit')  ?? '20')))
    const status = searchParams.get('status') ?? ''
    const offset = (page - 1) * limit

    const result = await db.query(
      `SELECT
         t.trip_id, t.trip_name, t.status, t.start_date, t.end_date,
         t.total_budget, t.currency, t.is_favorite,
         t.planning_time_seconds,
         fn_calcular_horas_planificacion(t.planning_time_seconds) AS horas_planificacion,
         t.created_at,
         u.email  AS user_email,
         u.first_name || ' ' || u.last_name AS user_name,
         d.name    AS destination_name,
         d.country AS destination_country,
         COUNT(ii.item_id) FILTER (WHERE ii.status <> 'CANCELLED') AS total_items,
         COUNT(*) OVER() AS total_count
       FROM trips t
       JOIN users u ON u.user_id = t.user_id
       LEFT JOIN destinations d ON d.destination_id = t.destination_id
       LEFT JOIN itinerary_days id_ ON id_.trip_id = t.trip_id
       LEFT JOIN itinerary_items ii ON ii.day_id = id_.day_id
       WHERE ($1 = '' OR t.status = $1)
       GROUP BY t.trip_id, u.email, u.first_name, u.last_name, d.name, d.country
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    )

    const total = parseInt(result.rows[0]?.total_count ?? '0')
    const trips = result.rows.map(({ total_count, ...r }) => r)
    return ok({ trips, total, page, limit })
  } catch (e: any) {
    return err(e.message, 500)
  }
}
