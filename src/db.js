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

// Return the latest temperature, average temperature, and log count per city.
export function getCitySummaries() {
  return database.prepare(`
    WITH ranked_logs AS (
      SELECT
        city,
        temperature_c,
        AVG(temperature_c) OVER (PARTITION BY city COLLATE NOCASE) AS average_temperature,
        COUNT(*) OVER (PARTITION BY city COLLATE NOCASE) AS log_count,
        ROW_NUMBER() OVER (
          PARTITION BY city COLLATE NOCASE
          ORDER BY created_at DESC, id DESC
        ) AS row_number
      FROM weather_logs
    )
    SELECT
      city,
      temperature_c AS latest_temperature,
      average_temperature,
      log_count
    FROM ranked_logs
    WHERE row_number = 1
    ORDER BY city COLLATE NOCASE
  `).all();
}