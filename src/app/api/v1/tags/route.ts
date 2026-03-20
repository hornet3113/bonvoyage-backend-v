import db from '@/lib/db'
import { ok, err } from '@/lib/response'
import { TagSchema } from '@/lib/schemas/trip.schema'
import { z } from 'zod'

export async function GET() {
  try {
    const result = await db.query(
      `SELECT tag_id, name, category, is_active
       FROM tags
       WHERE is_active = TRUE
       ORDER BY category, name`
    )
    const tags = z.array(TagSchema).parse(result.rows)
    return ok(tags)
  } catch (e: any) {
    return err(e.message, 500)
  }
}
