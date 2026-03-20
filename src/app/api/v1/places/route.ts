import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;


  let cityName = "Destino desconocido";
  let countryName = "";
  let searchQuery = "";

  const geoRes = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=es&types=place,region,country`
  );
  const geoData = await geoRes.json();
  const feature = geoData.features?.[0];

  if (feature) {

    const context = feature.context ?? [];
    const city = feature.place_type.includes("place") 
      ? feature.text 
      : context.find((c: any) => c.id.startsWith("place"))?.text;
    const country = context.find((c: any) => c.id.startsWith("country"))?.text 
      ?? (feature.place_type.includes("country") ? feature.text : "");

    cityName = city ?? feature.text;
    countryName = country;
    searchQuery = [city, country].filter(Boolean).join(" ");
  }

  let photoUrl: string | null = null;

  if (cityName !== "Destino desconocido") {
    const wikiRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(cityName)}&prop=pageimages&piprop=thumbnail&pithumbsize=900&format=json&gsrlimit=1`,
      { headers: { "User-Agent": "BonVoyageApp/1.0" } }
    );
    const wikiData = await wikiRes.json();
    const pages = wikiData.query?.pages;
    if (pages) {
      const firstPage = Object.values(pages)[0] as any;
      photoUrl = firstPage?.thumbnail?.source ?? null;
    }
  }

  // segiimos usando unsplash por si fala wikipedia
  if (!photoUrl && unsplashKey && searchQuery) {
    const unsplashRes = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${unsplashKey}` } }
    );
    const unsplashData = await unsplashRes.json();
    photoUrl = unsplashData.results?.[0]?.urls?.regular ?? null;
  }

  return NextResponse.json({
    name: cityName,
    country: countryName,
    fullName: [cityName, countryName].filter(Boolean).join(", "),
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    photoUrl,
  });
}