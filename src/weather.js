const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const CURRENT_FIELDS = 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code';

const weatherDescriptions = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with light hail',
  99: 'Thunderstorm with heavy hail'
};

// Fetch JSON from Open-Meteo and convert transport or response failures to concise errors.
async function fetchJson(url, endpointName) {
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch (error) {
    throw new Error(`Network error while contacting ${endpointName}: ${error.message}`);
  }

  if (!response.ok) {
    throw new Error(`${endpointName} returned HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`${endpointName} returned invalid JSON.`);
  }
}

// Resolve a city and return its first matching geocoding result.
async function geocodeCity(city) {
  const url = new URL(GEOCODING_URL);
  url.search = new URLSearchParams({ name: city, count: '1' });
  const data = await fetchJson(url, 'Open-Meteo geocoding');
  const location = data.results?.[0];

  if (!location) {
    const error = new Error(`Unknown city: ${city}. Check the spelling and try again.`);
    error.code = 'CITY_NOT_FOUND';
    throw error;
  }

  return location;
}

// Convert a WMO weather code into a readable condition.
export function describeWeatherCode(code) {
  return weatherDescriptions[code] ?? 'Unknown conditions';
}

// Fetch current conditions for a city and normalize them to the database schema.
export async function fetchCurrentWeather(city) {
  const normalizedCity = city.trim();
  if (!normalizedCity) {
    throw new Error('Please provide a city name.');
  }

  const location = await geocodeCity(normalizedCity);
  const url = new URL(FORECAST_URL);
  url.search = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: CURRENT_FIELDS
  });

  const data = await fetchJson(url, 'Open-Meteo forecast');
  const current = data.current;
  if (!current) {
    throw new Error('Open-Meteo forecast response did not include current conditions.');
  }

  return {
    city: location.name,
    country: location.country ?? null,
    latitude: data.latitude ?? location.latitude,
    longitude: data.longitude ?? location.longitude,
    temperature_c: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    wind_kmh: current.wind_speed_10m,
    condition: describeWeatherCode(current.weather_code),
    weather_code: current.weather_code
  };
}