import { NextRequest, NextResponse } from "next/server";
import db  from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      id, name, latitude, longitude, rating, imageUrl, price, 
      trip_id
    } = body;

    if (!trip_id) {
      return NextResponse.json({ error: "Falta el ID del viaje" }, { status: 400 });
    }
    const dayQuery = `
      SELECT day_id FROM itinerary_days 
      WHERE trip_id = $1 AND day_number = 1 
      LIMIT 1;
    `;
    const dayResult = await db.query(dayQuery, [trip_id]);

    if (dayResult.rows.length === 0) {
      return NextResponse.json({ error: "No se encontró el Día 1 para este viaje" }, { status: 404 });
    }

    const day_id = dayResult.rows[0].day_id;

    const upsertPlaceQuery = `
      INSERT INTO place_references (external_id, category, name, latitude, longitude, rating, api_source, extended_data)
      VALUES ($1, 'HOTEL', $2, $3, $4, $5, 'sky-scrapper', $6)
      ON CONFLICT (external_id, category) DO UPDATE SET cached_at = NOW()
      RETURNING reference_id;
    `;
    
    const placeResult = await db.query(upsertPlaceQuery, [
      id, name, latitude, longitude, parseFloat(rating) || 0,
      JSON.stringify({ photo_url: imageUrl, price })
    ]);
    const reference_id = placeResult.rows[0].reference_id;

    await db.query(`
      DELETE FROM itinerary_items 
      WHERE day_id = $1 AND item_type = 'PLACE';
    `, [day_id]);

    const insertItemQuery = `
      INSERT INTO itinerary_items (day_id, item_type, place_reference_id, estimated_cost, status, order_position)
      VALUES ($1, 'PLACE', $2, $3, 'PLANNED', 1)
      RETURNING item_id;
    `;

    const numericPrice = parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0;
    const itemResult = await db.query(insertItemQuery, [day_id, reference_id, numericPrice]);

    return NextResponse.json({
      success: true,
      message: "Hotel asignado como base del viaje en el Día 1",
      item_id: itemResult.rows[0].item_id
    });

  } catch (error: any) {
    console.error(" Error en la lógica de Itinerario:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}