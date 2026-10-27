import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { getCitySummaries, insertWeatherLog, listWeatherLogs } from './db.js';
import { fetchCurrentWeather } from './weather.js';

const port = Number(process.env.PORT) || 3000;
const indexPath = new URL('../public/index.html', import.meta.url);

// Send a JSON response with a consistent content type.
function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(data));
}

// Serve the single-page dashboard.
async function serveDashboard(response) {
  try {
    const html = await readFile(indexPath);
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(html);
  } catch {
    sendJson(response, 500, { error: 'Could not load the dashboard.' });
  }
}

// Route API requests and the dashboard page.
async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'GET' && requestUrl.pathname === '/api/logs') {
    sendJson(response, 200, { logs: listWeatherLogs(50) });
    return;
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/summary') {
    sendJson(response, 200, { summaries: getCitySummaries() });
    return;
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/refresh') {
    const city = requestUrl.searchParams.get('city')?.trim();
    if (!city) {
      sendJson(response, 400, { error: 'Provide a city with ?city=NAME.' });
      return;
    }

    try {
      const weather = await fetchCurrentWeather(city);
      const id = insertWeatherLog(weather);
      sendJson(response, 201, { id, weather });
    } catch (error) {
      const statusCode = error.code === 'CITY_NOT_FOUND' ? 404 : 502;
      sendJson(response, statusCode, { error: error.message });
    }
    return;
  }

  if (request.method === 'GET' && (requestUrl.pathname === '/' || requestUrl.pathname === '/index.html')) {
    await serveDashboard(response);
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch(() => {
    if (!response.headersSent) {
      sendJson(response, 500, { error: 'An unexpected server error occurred.' });
    } else {
      response.destroy();
    }
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Weather dashboard listening at http://localhost:${port}`);
});