import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { z } from 'zod'

const SavePlaceSchema = z.object({
  external_id:  z.string().min(1),
  category:     z.enum(['POI', 'RESTAURANT', 'HOTEL', 'ESSENTIAL_SERVICE']),
  name:         z.string().min(1),
  latitude:     z.number(),
  longitude:    z.number(),
  rating:       z.number().nullable().optional(),
  photo_url:    z.string().nullable().optional(),
  address:      z.string().nullable().optional(),
  price_level:  z.string().nullable().optional(),
  description:  z.string().nullable().optional(),
})

// ------------------------------------------------------------
//  POST /api/places/save
//  Hace upsert de un lugar en place_references y retorna
//  el reference_id listo para usar en itinerary_items
// ------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const body   = await request.json()
    const parsed = SavePlaceSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', detalles: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const {
      external_id,
      category,
      name,
      latitude,
      longitude,
      rating,
      photo_url,
      address,
      price_level,
      description,
    } = parsed.data

    const extended_data = {
      photo_url:   photo_url   ?? null,
      address:     address     ?? null,
      price_level: price_level ?? null,
      description: description ?? null,
    }

    const result = await db.query<{ reference_id: string }>(
      `INSERT INTO place_references
         (external_id, category, name, latitude, longitude, rating, api_source, extended_data)
       VALUES ($1, $2, $3, $4, $5, $6, 'google_places', $7::jsonb)
       ON CONFLICT (external_id, category)
       DO UPDATE SET
         name          = EXCLUDED.name,
         latitude      = EXCLUDED.latitude,
         longitude     = EXCLUDED.longitude,
         rating        = EXCLUDED.rating,
         extended_data = EXCLUDED.extended_data,
         cached_at     = NOW()
       RETURNING reference_id`,
      [
        external_id,
        category,
        name,
        latitude,
        longitude,
        rating ?? null,
        JSON.stringify(extended_data),
      ]
    )

    return NextResponse.json({
      success:      true,
      reference_id: result.rows[0].reference_id,
      name,
      category,
    })

  } catch (error: unknown) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[POST /api/places/save]', detalle)
    return NextResponse.json(
      { error: 'Error al guardar el lugar', detalle },
      { status: 500 }
    )
  }
}