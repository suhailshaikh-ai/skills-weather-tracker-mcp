# Open-Meteo API Notes

Both endpoints are public and require no API key.

## Geocoding

Endpoint: `https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1`

Use the first item in `results`. The tracker uses `name` as the city, `country` as the country, and `latitude` / `longitude` as the location coordinates.

Trimmed response for Pune:

```json
{
  "results": [
    {
      "name": "Pune",
      "latitude": 18.51957,
      "longitude": 73.85535,
      "country": "India"
    }
  ]
}
```

## Current Weather

Endpoint: `https://api.open-meteo.com/v1/forecast?latitude={latitude}&longitude={longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`

The tracker uses the response-level `latitude` and `longitude`, plus `current.temperature_2m`, `current.relative_humidity_2m`, `current.wind_speed_10m`, and `current.weather_code`. Units are provided by `current_units`: Celsius, percent, km/h, and WMO code. `condition` is the readable interpretation of `weather_code`; for code `0`, it is `Clear sky`. The SQLite `created_at` value records when the row was inserted; the API's `current.time` is not currently stored.

Trimmed response for Pune:

```json
{
  "latitude": 18.523726,
  "longitude": 73.86876,
  "current_units": {
    "temperature_2m": "°C",
    "relative_humidity_2m": "%",
    "wind_speed_10m": "km/h",
    "weather_code": "wmo code"
  },
  "current": {
    "time": "2026-10-27T13:15",
    "temperature_2m": 28.8,
    "relative_humidity_2m": 27,
    "wind_speed_10m": 13.6,
    "weather_code": 0
  }
}
```

The supplied forecast response coordinates (18.523726, 73.86876) differ slightly from the geocoding result (18.51957, 73.85535). The logged row uses the forecast response coordinates so they remain paired with the weather measurements.