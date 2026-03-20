import { NextRequest, NextResponse } from "next/server";
import { searchLocation } from "@/lib/services/airscraper.service";
import { FlightLocationQuerySchema } from "@/lib/schemas/flight.schema";

type LocationCandidate = {
  skyId?: string;
  entityId?: string;
  presentation?: {
    title?: string;
    subtitle?: string;
  };
  navigation?: {
    entityId?: string;
    relevantFlightParams?: {
      skyId?: string;
      entityId?: string;
      flightPlaceType?: string;
    };
    relevantHotelParams?: {
      entityId?: string;
    };
  };
  geo?: {
    latitude?: number;
    longitude?: number;
  };
  location?: {
    lat?: number;
    lon?: number;
    latitude?: number;
    longitude?: number;
  };
  image?: {
    url?: string;
  };
  photo?: {
    url?: string;
  };
  photos?: Array<{
    url?: string;
  }>;
};

function normalizeLocationCandidate(candidate: LocationCandidate) {
  const latitude =
    candidate?.geo?.latitude ??
    candidate?.location?.latitude ??
    candidate?.location?.lat ??
    null;
  const longitude =
    candidate?.geo?.longitude ??
    candidate?.location?.longitude ??
    candidate?.location?.lon ??
    null;

  return {
    skyId: candidate?.navigation?.relevantFlightParams?.skyId ?? candidate?.skyId ?? null,
    entityId:
      candidate?.navigation?.relevantFlightParams?.entityId ??
      candidate?.navigation?.entityId ??
      candidate?.entityId ??
      null,
    name: candidate?.presentation?.title ?? null,
    subtitle: candidate?.presentation?.subtitle ?? null,
    type: candidate?.navigation?.relevantFlightParams?.flightPlaceType ?? null,
    lat: latitude,
    lng: longitude,
    imageUrl:
      candidate?.image?.url ?? candidate?.photo?.url ?? candidate?.photos?.[0]?.url ?? null,
  };
}

export async function GET(request: NextRequest) {
  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsedParams = FlightLocationQuerySchema.safeParse(rawParams);

  if (!parsedParams.success) {
    return NextResponse.json(
      {
        error: "Parámetros inválidos",
        recibido: rawParams,
        detalles: parsedParams.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const locationData = await searchLocation(parsedParams.data.query);
    const rawCandidates: LocationCandidate[] = Array.isArray(locationData?.data)
      ? locationData.data
      : [];

    const locations = rawCandidates.map(normalizeLocationCandidate);

    return NextResponse.json({
      success: true,
      data: locationData,
      locations,
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      { error: "Error al buscar ubicaciones", detalle },
      { status: 500 }
    );
  }
}
