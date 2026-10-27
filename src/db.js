import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';

const databasePath = fileURLToPath(new URL('../weather.db', import.meta.url));
const database = new Database(databasePath);

// Store one fetched weather observation.
export function insertWeatherLog(weather) {
  const result = database.prepare(`
    INSERT INTO weather_logs (
      city, country, latitude, longitude, temperature_c, humidity,
      wind_kmh, condition, weather_code
    ) VALUES (
      @city, @country, @latitude, @longitude, @temperature_c, @humidity,
      @wind_kmh, @condition, @weather_code
    )
  `).run(weather);

  return result.lastInsertRowid;
}

// Return the newest observations first.
export function listWeatherLogs(limit) {
  return database.prepare(`
    SELECT id, city, country, temperature_c, humidity, wind_kmh, condition, created_at
    FROM weather_logs
    ORDER BY created_at DESC, id DESC
    LIMIT ?
  `).all(limit);
}

// Aggregate temperature readings for a city, without case sensitivity.
export function getCityStats(city) {
  return database.prepare(`
    SELECT
      MIN(temperature_c) AS minimum,
      MAX(temperature_c) AS maximum,
      AVG(temperature_c) AS average,
      COUNT(*) AS count
    FROM weather_logs
    WHERE city = ? COLLATE NOCASE
  `).get(city);
}