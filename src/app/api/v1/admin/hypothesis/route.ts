import { auth } from '@clerk/nextjs/server'
import { ok, err } from '@/lib/response'
import { requireAdmin } from '@/lib/services/admin.service'
import db from '@/lib/db'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return err('No autorizado', 401)

    const adminId = await requireAdmin(userId)
    if (!adminId) return err('Forbidden', 403)

    const result = await db.query(
      `SELECT
         vh.trip_id, vh.trip_name, vh.status,
         vh.planning_time_seconds,
         vh.horas_planificacion,
         vh.total_items_planificados,
         vh.resultado_hipotesis,
         u.email AS user_email
       FROM vw_hipotesis_validacion vh
       JOIN trips t ON t.trip_id = vh.trip_id
       JOIN users u ON u.user_id = t.user_id
       ORDER BY vh.horas_planificacion ASC
       LIMIT 100`
    )

    return ok(result.rows)
  } catch (e: any) {
    return err(e.message, 500)
  }
}
