import { NextRequest, NextResponse } from "next/server";
import { searchHotels } from "@/lib/services/airscraper.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const destination = searchParams.get("destination");
  const checkIn = searchParams.get("checkin") || searchParams.get("checkIn"); 
  const checkOut = searchParams.get("checkout") || searchParams.get("checkOut");
  const adults = searchParams.get("adults") || "2";
  const rooms = searchParams.get("rooms") || "1";
  const currency = searchParams.get("currency") || "MXN";

  if (!destination || !checkIn || !checkOut) {
    return NextResponse.json(
      { 
        error: "Faltan parámetros obligatorios",
        recibido: { destination, checkIn, checkOut } 
      },
      { status: 400 }
    );
  }


  try {
    const hotelData = await searchHotels({
      destination,
      checkIn,
      checkOut,
      adults,
      rooms,
      currency
    });

    return NextResponse.json({
      success: true,
      data: hotelData
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Error al buscar hoteles" },
      { status: 500 }
    );
  }
}