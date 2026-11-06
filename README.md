# SkyCast – Weather Forecast Website

A responsive weather dashboard built with HTML, CSS and vanilla JavaScript. It uses the free [Open-Meteo](https://open-meteo.com/) APIs, so no API key is needed.

## Features
- Search any city (Open-Meteo geocoding API)
- Current temperature, conditions, feels-like, humidity, wind and pressure
- 7-day forecast
- °C / °F toggle and "My location" button
- Auto-refresh every 10 minutes
- Loading indicator and clear error messages (city not found, network issues, timeouts)
- Remembers your last city (localStorage)
- Responsive layout with automatic dark mode

## Skills Demonstrated
Fetch API, async/await, JSON handling, error handling, DOM manipulation, responsive CSS (Grid/Flexbox).

## Run Locally
Open `index.html` in a browser, or use a local server (e.g. VS Code Live Server).

## Structure
```
weather-app/
├── index.html
├── style.css
├── script.js
├── images/logo.svg
└── README.md
```
