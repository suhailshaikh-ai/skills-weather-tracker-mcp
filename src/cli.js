import { getCityStats, insertWeatherLog, listWeatherLogs } from './db.js';
import { fetchCurrentWeather } from './weather.js';

const DEFAULT_LIMIT = 10;

// Print the supported commands and usage forms.
function printUsage() {
  console.error('Usage:');
  console.error('  node src/cli.js add "<city>"');
  console.error('  node src/cli.js list [--limit N]');
  console.error('  node src/cli.js stats "<city>"');
}

// Format rows as a fixed-width table for terminal output.
function formatTable(headers, rows) {
  const widths = headers.map((header, index) => Math.max(
    header.length,
    ...rows.map((row) => String(row[index] ?? '').length)
  ));
  const separator = `+${widths.map((width) => '-'.repeat(width + 2)).join('+')}+`;
  const formatRow = (row) => `| ${row.map((value, index) =>
    String(value ?? '').padEnd(widths[index])).join(' | ')} |`;

  return [separator, formatRow(headers), separator, ...rows.map(formatRow), separator].join('\n');
}

// Add current weather for the requested city.
async function runAdd(args) {
  const city = args.join(' ').trim();
  if (!city) {
    throw new Error('Please provide a city name.');
  }

  const weather = await fetchCurrentWeather(city);
  const id = insertWeatherLog(weather);
  console.log(`Logged weather for ${weather.city}, ${weather.country}: ${weather.temperature_c} C, ${weather.condition}, ${weather.humidity}% humidity, ${weather.wind_kmh} km/h wind (id ${id}).`);
}

// Parse list options and display recent observations.
function runList(args) {
  let limit = DEFAULT_LIMIT;
  if (args.length > 0) {
    if (args.length !== 2 || args[0] !== '--limit') {
      throw new Error('Use list with an optional --limit N.');
    }
    limit = Number(args[1]);
    if (!Number.isSafeInteger(limit) || limit < 1) {
      throw new Error('The limit must be a positive whole number.');
    }
  }

  const logs = listWeatherLogs(limit);
  if (logs.length === 0) {
    console.log('No weather logs found.');
    return;
  }

  const rows = logs.map((log) => [
    log.id,
    log.city,
    log.country ?? '',
    `${Number(log.temperature_c).toFixed(1)} C`,
    log.condition,
    `${log.humidity}%`,
    `${Number(log.wind_kmh).toFixed(1)} km/h`,
    log.created_at
  ]);
  console.log(formatTable(
    ['ID', 'City', 'Country', 'Temp', 'Condition', 'Humidity', 'Wind', 'Logged At'],
    rows
  ));
}

// Display temperature aggregates for one city.
function runStats(args) {
  const city = args.join(' ').trim();
  if (!city) {
    throw new Error('Please provide a city name.');
  }

  const stats = getCityStats(city);
  if (stats.count === 0) {
    console.log(`No weather logs found for ${city}.`);
    return;
  }

  console.log(`Weather statistics for ${city}:`);
  console.log(`  Logs: ${stats.count}`);
  console.log(`  Minimum: ${stats.minimum.toFixed(1)} C`);
  console.log(`  Maximum: ${stats.maximum.toFixed(1)} C`);
  console.log(`  Average: ${stats.average.toFixed(1)} C`);
}

// Dispatch one CLI command and report errors without a stack trace.
async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    if (command === 'add') {
      await runAdd(args);
    } else if (command === 'list') {
      runList(args);
    } else if (command === 'stats') {
      runStats(args);
    } else {
      printUsage();
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

await main();