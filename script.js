const apiKey = "660ce96c12a84b008dd105706262303";

const $ = (id) => document.getElementById(id);

const searchInput = $("search");
const suggestionsList = $("suggestions");
const sun = document.querySelector(".sun");
const moon = document.querySelector(".moon");
const starsContainer = $("stars");
const button = document.querySelector(".search-btn");

let tempChart = null;
let rainChart = null;
let skyInterval = null;

/* ---------- INIT ---------- */
window.addEventListener("load", detectCurrentLocation);
createStars();
getWeather("Jaipur");

/* ---------- SEARCH ---------- */
searchInput.addEventListener("input", async ({ target }) => {
    const query = target.value.trim();
    if (!query) return hideSuggestions();

    try {
        const res = await fetch(`https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${query}`);
        const data = await res.json();

        suggestionsList.innerHTML = "";
        if (!data?.length) return hideSuggestions();

        data.forEach(city => {
            const li = document.createElement("li");
            li.textContent = `${city.name}, ${city.region}, ${city.country}`;
            li.onclick = () => {
                searchInput.value = city.name;
                hideSuggestions();
                getWeather(city.name);
            };
            suggestionsList.appendChild(li);
        });

        suggestionsList.style.display = "block";
    } catch {
        hideSuggestions();
    }
});

const hideSuggestions = () => {
    suggestionsList.innerHTML = "";
    suggestionsList.style.display = "none";
};

document.addEventListener("click", e => {
    if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) hideSuggestions();
});

searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") getWeather(searchInput.value);
});
button.onclick = () => getWeather(searchInput.value);

/* ---------- WEATHER ---------- */
const fetchWeather = async (q) => {
    const res = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${q}&days=7`);
    const data = await res.json();
    if (data.error) throw "City not found";
    return data;
};

async function getWeather(city) {
    if (!city) return;
    try {
        const data = await fetchWeather(city);
        updateUI(data);
    } catch {
        alert("City not found!");
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        const data = await fetchWeather(`${lat},${lon}`);
        updateUI(data);
        return data;
    } catch {}
}

/* ---------- STARS ---------- */
function createStars(count = 100, constellationCount = 15) {
    starsContainer.innerHTML = "";
    const { innerWidth: w, innerHeight: h } = window;

    for (let i = 0; i < count; i++) {
        const s = document.createElement("div");
        s.className = "star";
        s.style.cssText = `left:${Math.random()*w}px;top:${Math.random()*h}px`;
        starsContainer.appendChild(s);
    }

    for (let i = 0; i < constellationCount; i++) {
        const x = Math.random() * w, y = Math.random() * h;

        for (let j = 0; j < 4; j++) {
            const s = document.createElement("div");
            s.className = "constellation";
            s.style.cssText = `left:${x + Math.random()*40}px;top:${y + Math.random()*40}px`;
            starsContainer.appendChild(s);
        }
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.style.cssText = "position:absolute;top:0;left:0";
    starsContainer.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "rgba(255,255,255,0.3)";

    for (let i = 0; i < constellationCount; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x+30, y+20);
        ctx.lineTo(x+60, y-10);
        ctx.stroke();
    }
}

/* ---------- UI ---------- */
function updateUI(data) {
    $("location").innerText = data.location.name;
    $("temp").innerText = data.current.temp_c + "°";
    $("condition").innerText = data.current.condition.text;

    const astro = data.forecast.forecastday[0].astro;

    showForecast(data);
    showDetails(data);

const localtime = data.location.localtime;
const hours = getCityHours(localtime);

updateDayNightFromAPI(astro.sunrise, astro.sunset, astro.moonrise, astro.moonset, hours);
updateSunPositionFromAPI(astro.sunrise, astro.sunset, hours);
startSkyAnimation(astro.sunrise, astro.sunset, astro.moonrise, astro.moonset, localtime);

    requestAnimationFrame(() => {
        drawTempGraph(data);
        drawRainGraph(data);
    });
}

/* ---------- TIME UTILS ---------- */
const parseTime = (t) => {
    let [time, mer] = t.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (mer === "PM" && h !== 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;
    return h + m/60;
};

/* ---------- DAY/NIGHT ---------- */
function updateDayNightFromAPI(sunrise, sunset, moonrise, moonset, hours) {
    const sky = $("sky");

    const sr = parseTime(sunrise), ss = parseTime(sunset);

    if (hours >= sr && hours < ss) {
        sky.classList.add("day");
        sky.classList.remove("night");
        sun.style.opacity = 1;
        moon.style.opacity = 0;
        starsContainer.style.opacity = 0;
    } else {
        sky.classList.add("night");
        sky.classList.remove("day");
        sun.style.opacity = 0;
        moon.style.opacity = 1;
        starsContainer.style.opacity = 1;

        const validMoon = moonrise.includes(":") && moonset.includes(":");

if (validMoon) {
    const mr = parseTime(moonrise);
    const ms = parseTime(moonset);

    const duration = ms > mr ? (ms - mr) : (24 - mr + ms);
    const elapsed = hours >= mr ? (hours - mr) : (24 - mr + hours);

    const p = Math.min(Math.max(elapsed / duration, 0), 1);

    moon.style.opacity = 1;
    moon.style.left = `${100 - p * 100}%`;
    moon.style.top = `${60 - Math.sin(p * Math.PI) * 40}px`;

} else {
    // No moon data → hide moon safely
    moon.style.opacity = 0;
}

        moon.style.left = `${100 - p*100}%`;
        moon.style.top = `${60 - Math.sin(p*Math.PI)*40}px`;
    }
}

function updateSunPositionFromAPI(sunrise, sunset, hours) {

    const sr = parseTime(sunrise), ss = parseTime(sunset);

    if (hours >= sr && hours <= ss) {
        const p = (hours - sr) / (ss - sr);
        sun.style.left = `${p*100}%`;
        sun.style.top = `${60 - Math.sin(p*Math.PI)*40}px`;
    }
}

function startSkyAnimation(sr, ss, mr, ms, localtime) {
    clearInterval(skyInterval);

   let baseTime = new Date(localtime.replace(" ", "T"));
    skyInterval = setInterval(() => {
        baseTime.setMinutes(baseTime.getMinutes() + 1);

        const hours = baseTime.getHours() + baseTime.getMinutes() / 60;

        updateDayNightFromAPI(sr, ss, mr, ms, hours);
        updateSunPositionFromAPI(sr, ss, hours);

    }, 60000);
}

function getCityHours(localtime) {
    // format: "2026-04-12 08:30"
    const time = localtime.split(" ")[1];
    const [h, m] = time.split(":").map(Number);
    return h + m / 60;
}

/* ---------- FORECAST ---------- */
function showForecast(data) {
    const div = $("forecast");
    div.innerHTML = "";

    data.forecast.forecastday.forEach((d, i) => {
        const day = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });
        div.innerHTML += `
        <div class="day ${i===0?"active":""}">
            <p>${day}</p>
            <img src="https:${d.day.condition.icon}">
            <p>${d.day.maxtemp_c}°</p>
            <small>${d.day.mintemp_c}°</small>
        </div>`;
    });
}

/* ---------- DETAILS ---------- */
function showDetails(data) {
    const astro = data.forecast.forecastday[0].astro;

    $("details").innerHTML = `
        <div class="detail-box large"><p>Temperature (Hourly)</p><canvas id="tempChart"></canvas></div>
        <div class="detail-box large"><p>Precipitation (%)</p><canvas id="rainChart"></canvas></div>
        <div class="detail-box"><p>Wind</p><h3>${data.current.wind_kph} km/h ${data.current.wind_dir}</h3></div>
        <div class="detail-box"><p>Humidity</p><h3>${data.current.humidity}%</h3></div>
        <div class="detail-box"><p>UV Index</p><h3>${data.current.uv}</h3></div>
        <div class="detail-box"><p>Sunrise / Sunset</p><h3>${astro.sunrise} / ${astro.sunset}</h3></div>
        <div class="detail-box"><p>Moonrise / Moonset</p><h3>${astro.moonrise} / ${astro.moonset}</h3></div>
    `;

    tempChart = null;
    rainChart = null;
}

/* ---------- TEMP GRAPH ---------- */
function drawTempGraph(data) {
    const canvas = $("tempChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (tempChart) tempChart.destroy();

    const hours = data.forecast.forecastday[0].hour;
    const currentHour = Math.floor(getCityHours(data.location.localtime));
    const filtered = hours.filter((_, i) => i % 3 === 0);

    const temps = filtered.map(h => h.temp_c);
    const labels = filtered.map(h => {
        const hour = new Date(h.time).getHours();
        return hour === currentHour ? "Now" : ((hour % 12) || 12) + (hour < 12 ? " AM" : " PM");
    });

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, "rgba(255,255,255,0.35)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    tempChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [{ data: temps, borderColor: "white", backgroundColor: gradient, fill: true, tension: 0.45 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "white" }, grid: { display: false } }, y: { display: false } } }
    });
}

/* ---------- RAIN GRAPH ---------- */
function drawRainGraph(data) {
    const canvas = $("rainChart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (rainChart) rainChart.destroy();

    const hours = data.forecast.forecastday[0].hour;
    const filtered = hours.filter((_, i) => i % 3 === 0);

    const rain = filtered.map(h => h.chance_of_rain ?? 0);
    const labels = filtered.map(h => h.time.split(" ")[1]);

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, "rgba(79,172,254,0.35)");
    gradient.addColorStop(1, "rgba(79,172,254,0)");

    rainChart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [{ data: rain, borderColor: "#4facfe", backgroundColor: gradient, fill: true, tension: 0.45 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: "white" }, grid: { display: false } }, y: { display: false } } }
    });
}

/* ---------- LOCATION ---------- */
function detectCurrentLocation() {
    if (!navigator.geolocation) return getWeather("Jaipur");

    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
        try {
            const data = await getWeatherByCoords(coords.latitude, coords.longitude);
            if (!data || data.location.name.length < 3) getWeather("Jaipur");
        } catch {
            getWeather("Jaipur");
        }
    }, () => getWeather("Jaipur"));
}