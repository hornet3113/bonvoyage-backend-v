
// ... (Aquí está tu interface y función de flights que hicimos antes)

interface HotelSearchParams {
  destination: string; 
  checkIn: string; 
  checkOut: string; 
  adults?: string;
  rooms?: string;
  currency?: string;
}

export async function searchHotels(params: HotelSearchParams) {
  const { destination, checkIn, checkOut, adults = "1", rooms = "1", currency = "USD" } = params;

  const url = new URL('https://sky-scrapper.p.rapidapi.com/api/v1/hotels/searchHotels');
  
  url.searchParams.append('limit', '30');
  url.searchParams.append('sorting', '-relevance');
  url.searchParams.append('market', 'en-US'); // Puedes cambiarlo a 'es-MX' para español
  url.searchParams.append('countryCode', 'US'); // Puedes cambiarlo a 'MX'
  
  url.searchParams.append('adults', adults);
  url.searchParams.append('rooms', rooms);
  url.searchParams.append('currency', currency);
    url.searchParams.append('entityId', destination); 
  url.searchParams.append('checkin', checkIn);
  url.searchParams.append('checkout', checkOut);

  
}