import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      id, name, latitude, longitude, rating, type, address, 
      trip_id, day_id 
    } = body;

    if (!trip_id || !day_id || !id) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (trip_id, day_id, id)" }, 
        { status: 400 }
      );
    }

    
    const upsertPlaceQuery = `
      INSERT INTO place_references (external_id, category, name, latitude, longitude, rating, api_source, extended_data)
      VALUES ($1, 'SERVICE', $2, $3, $4, $5, 'frontend', $6)
      ON CONFLICT (external_id, category) 
      DO UPDATE SET name = EXCLUDED.name, extended_data = EXCLUDED.extended_data
      RETURNING reference_id;
    `;
    
    const extendedData = JSON.stringify({ 
      service_type: type, 
      address: address || null 
    });

    const placeResult = await db.query(upsertPlaceQuery, [
      id, 
      name, 
      latitude, 
      longitude, 
      parseFloat(rating) || 0, 
      extendedData
    ]);
    const reference_id = placeResult.rows[0].reference_id;

    const result = await db.query<{ item_id: string }>(
      `SELECT fn_add_itinerary_item(
         $1::uuid, $2::uuid, $3::varchar, $4::uuid, NULL::uuid, NULL::time, NULL::time, 0::numeric, $5::text
       ) AS item_id`,
      [
        trip_id,
        day_id,
        'PLACE', 
        reference_id,
        `Servicio de emergencia / utilidad: ${type}` 
      ]
    );

    return NextResponse.json({
      success: true,
      message: "Servicio guardado exitosamente en el itinerario",
      item_id: result.rows[0].item_id
    }, { status: 201 });

  } catch (error: any) {
    console.error("[POST /api/services/save] Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}