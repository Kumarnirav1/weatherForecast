// SkyCast – uses the free Open-Meteo APIs (no API key required)
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const REFRESH_MS = 10 * 60 * 1000; // live update every 10 minutes

const $ = (id) => document.getElementById(id);
const els = {
  form: $("searchForm"), input: $("cityInput"), locBtn: $("locBtn"), unitBtn: $("unitBtn"),
  status: $("status"), weather: $("weather"), place: $("place"), updated: $("updated"),
  icon: $("icon"), temp: $("temp"), desc: $("desc"), details: $("details"), forecast: $("forecast"),
};

const state = { place: null, metric: true };

// WMO weather codes → description + emoji
const CODES = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Freezing fog", "🌫️"],
  51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "❄️"],
  80: ["Light showers", "🌦️"], 81: ["Showers", "🌧️"], 82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"], 86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Severe thunderstorm", "⛈️"],
};
const codeInfo = (c) => CODES[c] || ["Unknown", "❓"];

/* ---------- UI helpers ---------- */
function showStatus(type, message) {
  els.status.hidden = false;
  els.status.className = "status " + type;
  els.status.textContent = "";
  if (type === "loading") {
    const s = document.createElement("span");
    s.className = "spinner";
    els.status.append(s);
  }
  els.status.append(message);
}
const hideStatus = () => { els.status.hidden = true; };
function setBusy(busy) {
  [els.input, els.locBtn, els.form.querySelector("button[type=submit]")].forEach((e) => (e.disabled = busy));
}

/* ---------- API ---------- */
async function fetchJSON(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("The weather service returned an error (" + res.status + "). Please try again.");
    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error("The request timed out. Please try again.");
    if (err instanceof TypeError) throw new Error("Network problem. Check your internet connection.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function findCity(name) {
  const data = await fetchJSON(GEO_URL + "?name=" + encodeURIComponent(name) + "&count=1&language=en&format=json");
  if (!data.results || !data.results.length) throw new Error("No city found for “" + name + "”. Check the spelling.");
  const r = data.results[0];
  return { name: [r.name, r.admin1, r.country].filter(Boolean).join(", "), lat: r.latitude, lon: r.longitude };
}

async function loadWeather(place, silent = false) {
  if (!silent) { setBusy(true); showStatus("loading", "Loading weather…"); }
  try {
    const url = FORECAST_URL +
      "?latitude=" + place.lat + "&longitude=" + place.lon +
      "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&forecast_days=7&timezone=auto" +
      "&temperature_unit=" + (state.metric ? "celsius" : "fahrenheit") +
      "&wind_speed_unit=" + (state.metric ? "kmh" : "mph");
    const data = await fetchJSON(url);
    state.place = place;
    render(data);
    hideStatus();
    try { localStorage.setItem("skycast-place", JSON.stringify(place)); } catch (e) { /* storage unavailable */ }
  } catch (err) {
    if (!silent) { els.weather.hidden = true; }
    showStatus("error", err.message);
  } finally {
    if (!silent) setBusy(false);
  }
}

/* ---------- Rendering ---------- */
function render(data) {
  const u = state.metric ? "°C" : "°F";
  const c = data.current;
  const [desc, icon] = codeInfo(c.weather_code);

  els.place.textContent = state.place.name;
  els.updated.textContent = "Updated at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  els.icon.textContent = icon;
  els.temp.textContent = Math.round(c.temperature_2m) + u;
  els.desc.textContent = desc;
  els.unitBtn.textContent = u;

  const items = [
    ["Feels like", Math.round(c.apparent_temperature) + u],
    ["Humidity", c.relative_humidity_2m + "%"],
    ["Wind", Math.round(c.wind_speed_10m) + (state.metric ? " km/h" : " mph")],
    ["Pressure", Math.round(c.surface_pressure) + " hPa"],
  ];
  els.details.replaceChildren(...items.map(([label, value]) => {
    const box = document.createElement("div");
    const dt = document.createElement("dt"); dt.textContent = label;
    const dd = document.createElement("dd"); dd.textContent = value;
    box.append(dt, dd);
    return box;
  }));

  const d = data.daily;
  els.forecast.replaceChildren(...d.time.map((date, i) => {
    const [dayDesc, dayIcon] = codeInfo(d.weather_code[i]);
    const name = i === 0 ? "Today" : new Date(date + "T00:00").toLocaleDateString([], { weekday: "short" });
    const card = document.createElement("article");
    card.className = "card day";
    card.title = dayDesc;
    const parts = [
      ["name", name], ["ico", dayIcon],
      ["hi", Math.round(d.temperature_2m_max[i]) + "°"],
      ["lo", Math.round(d.temperature_2m_min[i]) + "°"],
      ["rain", "💧 " + (d.precipitation_probability_max[i] ?? 0) + "%"],
    ];
    parts.forEach(([cls, text]) => {
      const div = document.createElement("div");
      div.className = cls; div.textContent = text;
      card.append(div);
    });
    return card;
  }));

  els.weather.hidden = false;
}

/* ---------- Events ---------- */
els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = els.input.value.trim();
  if (!name) { showStatus("error", "Please enter a city name."); return; }
  setBusy(true);
  showStatus("loading", "Searching…");
  try {
    const place = await findCity(name);
    await loadWeather(place);
  } catch (err) {
    els.weather.hidden = true;
    showStatus("error", err.message);
    setBusy(false);
  }
});

els.locBtn.addEventListener("click", () => {
  if (!navigator.geolocation) { showStatus("error", "Geolocation is not supported by your browser."); return; }
  setBusy(true);
  showStatus("loading", "Getting your location…");
  navigator.geolocation.getCurrentPosition(
    (pos) => loadWeather({ name: "Your location", lat: pos.coords.latitude, lon: pos.coords.longitude }),
    () => { showStatus("error", "Couldn’t get your location. Allow access or search for a city."); setBusy(false); },
    { timeout: 10000 }
  );
});

els.unitBtn.addEventListener("click", () => {
  state.metric = !state.metric;
  els.unitBtn.textContent = state.metric ? "°C" : "°F";
  if (state.place) loadWeather(state.place);
});

// Live updates: refresh quietly while the tab is visible
setInterval(() => { if (state.place && !document.hidden) loadWeather(state.place, true); }, REFRESH_MS);

// Start: last searched city, otherwise a default
(function init() {
  let place = null;
  try { place = JSON.parse(localStorage.getItem("skycast-place")); } catch (e) { /* ignore */ }
  loadWeather(place || { name: "Bengaluru, Karnataka, India", lat: 12.9716, lon: 77.5946 });
})();
