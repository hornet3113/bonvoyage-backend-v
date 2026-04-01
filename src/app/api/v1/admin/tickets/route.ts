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
    const estado = searchParams.get('estado') ?? ''
    const offset = (page - 1) * limit

    const result = await db.query(
      `SELECT
         tk.ticket_id, tk.trip_id, tk.total_budget,
         tk.costo_acumulado, tk.available_balance,
         tk.total_lugares, tk.total_vuelos, tk.total_items,
         tk.budget_status, tk.updated_at,
         t.trip_name, t.status AS trip_status,
         u.email AS user_email,
         u.first_name || ' ' || u.last_name AS user_name,
         COUNT(*) OVER() AS total_count
       FROM tickets tk
       JOIN trips t ON t.trip_id = tk.trip_id
       JOIN users u ON u.user_id = tk.user_id
       WHERE ($1 = '' OR tk.budget_status = $1)
       ORDER BY tk.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [estado, limit, offset]
    )

    const total = parseInt(result.rows[0]?.total_count ?? '0')
    const tickets = result.rows.map(({ total_count, ...r }) => r)
    return ok({ tickets, total, page, limit })
  } catch (e: any) {
    return err(e.message, 500)
  }
}
