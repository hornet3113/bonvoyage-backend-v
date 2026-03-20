import { NextRequest, NextResponse } from "next/server";

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCandidateQueries(rawQuery: string) {
  const normalized = normalizeSearchText(rawQuery);
  const withoutCountry = normalized.split(",")[0]?.trim() ?? normalized;

  return Array.from(new Set([rawQuery.trim(), normalized, withoutCountry])).filter(Boolean);
}

async function searchDestinationOrHotel(query: string) {
  const encodedQuery = encodeURIComponent(query);

  const response = await fetch(
    `https://sky-scrapper.p.rapidapi.com/api/v1/hotels/searchDestinationOrHotel?query=${encodedQuery}`,
    {
      headers: {
        "x-rapidapi-host": "sky-scrapper.p.rapidapi.com",
        "x-rapidapi-key": process.env.RAPIDAPI_KEY as string,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Error de Sky Scrapper (${response.status})`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) return NextResponse.json({ error: "Falta el término de búsqueda" }, { status: 400 });

  try {
    const candidateQueries = buildCandidateQueries(query);

    let locations: Array<{
      entityId: string;
      name: string;
      type: string;
      fullTitle: string;
    }> = [];

    for (const candidate of candidateQueries) {
      const result = await searchDestinationOrHotel(candidate);
      const rawLocations = Array.isArray(result?.data) ? result.data : [];

      locations = rawLocations.map((loc: any) => ({
        entityId: String(loc.entityId),
        name: loc.entityName,
        type: loc.entityType,
        fullTitle: loc.hierarchy,
      }));

      if (locations.length > 0) {
        break;
      }
    }

    if (locations.length === 0) {
      return NextResponse.json(
        {
          error: "No se encontraron destinos para esa búsqueda",
          recibido: { query },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(locations);
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "Error desconocido";

    return NextResponse.json(
      { error: "Error al buscar destino", detalle },
      { status: 500 }
    );
  }
}