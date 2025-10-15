const API_KEY = "YOUR_API_KEY_HERE";
const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const searchBtn = document.getElementById("searchBtn");
const weatherBox = document.getElementById("weatherBox");
const masonryGrid = document.getElementById("masonryGrid");
const mockToggle = document.getElementById("mockToggle");

function formatDateLabel(dateStr) {
    const d = new Date(dateStr);
    const opts = { weekday: 'short', month: 'short', day: 'numeric' };
    return d.toLocaleDateString(undefined, opts);
}

function mostFrequentIcon(iconArr) {
    const freq = {};
    let max = 0, best = iconArr[0] || '01d';
    for (const it of iconArr) {
    freq[it] = (freq[it] || 0) + 1;
    if (freq[it] > max) { max = freq[it]; best = it; }
    }
    return best;
}

function aggregateDaily(list) {
    const days = {};
    for (const item of list) {
    const dt = new Date(item.dt * 1000);
    const key = dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0');
    if (!days[key]) days[key] = { temps: [], humid: [], wind: [], icons: [] };
    days[key].temps.push(item.main.temp);
    days[key].humid.push(item.main.humidity);
    days[key].wind.push(item.wind.speed);
    if (item.weather && item.weather[0] && item.weather[0].icon) days[key].icons.push(item.weather[0].icon);
    }
    const out = Object.keys(days).map(key => {
    const d = days[key];
    const avg = arr => Math.round((arr.reduce((a,b)=>a+b,0)/arr.length)*10)/10;
    return { date: key, label: formatDateLabel(key), temp: avg(d.temps), humidity: Math.round(avg(d.humid)), wind: Math.round(avg(d.wind)*10)/10, icon: mostFrequentIcon(d.icons) };
    });
    out.sort((a,b)=> new Date(a.date)-new Date(b.date));
    return out;
}

function generateMockDays(seedDay, count = 5) {
    const iconsPool = ['01d','02d','03d','04d','09d','10d','11d','13d','50d'];
    const res = [];
    const seedDate = new Date(seedDay.date);
    for (let i=1;i<=count;i++) {
    const d = new Date(seedDate); d.setDate(d.getDate()+i);
    const temp = Math.round((seedDay.temp + (Math.random()*6-3))*10)/10;
    const humidity = Math.max(20, Math.min(100, seedDay.humidity + Math.round((Math.random()*20-10))));
    const wind = Math.max(0, Math.round((seedDay.wind + (Math.random()*4-2))*10)/10);
    const icon = iconsPool[Math.floor(Math.random()*iconsPool.length)];
    res.push({ date: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'), label: formatDateLabel(d.toISOString()), temp, humidity, wind, icon });
    }
    return res;
}

function displayMainCard(cityName, dayData) {
    const iconUrl = `https://openweathermap.org/img/wn/${dayData.icon}@2x.png`;
    weatherBox.innerHTML = `
    <div class="glass-card">
        <img src="${iconUrl}" alt="${dayData.icon}" />
        <h1>${Math.round(dayData.temp)}°C</h1>
        <h2>${cityName}</h2>
        <div class="weather-details">
        <div class="humidity">💧 ${dayData.humidity}%</div>
        <div class="wind">🌬️ ${dayData.wind} km/h</div>
        </div>
    </div>
    `;
}

function displayMasonry(days) {
    masonryGrid.innerHTML = '';
    for (const d of days) {
    const iconUrl = `https://openweathermap.org/img/wn/${d.icon}@2x.png`;
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
        <div class="date">${d.label}</div>
        <img src="${iconUrl}" alt="${d.icon}" />
        <div class="temp">${Math.round(d.temp)}°C</div>
        <div class="meta">💧${d.humidity}% 🌬️${d.wind} km/h</div>
    `;
    masonryGrid.appendChild(card);
    }
}

async function fetchWeather(city, country='', useMock=false) {
    let query = city; if(country) query += ','+country;
    if(useMock) {
    const mockDay = { date: new Date().toISOString(), temp: 28, humidity: 55, wind: 12, icon: '03d' };
    displayMainCard(city, mockDay);
    displayMasonry(generateMockDays(mockDay, 10));
    return;
    }

    try {
    // fetch 5-day / 3h forecast (free OpenWeatherMap)
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${query}&appid=${API_KEY}&units=metric`;
    const res = await fetch(url);
    const data = await res.json();
    if(data.cod != '200') { weatherBox.innerHTML = `<p style="color:white;">City not found ❌</p>`; masonryGrid.innerHTML=''; return; }

    const daily = aggregateDaily(data.list);
    displayMainCard(city, daily[0]);
    const remainingDays = daily.slice(1,10); // show up to 10 days
    const mockExtra = generateMockDays(daily[daily.length-1], 10-remainingDays.length);
    displayMasonry([...remainingDays, ...mockExtra]);
    } catch(e) { console.error(e); }
}

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    const country = countryInput.value.trim();
    if(!city) return alert('Please enter a city!');
    const useMock = mockToggle.checked;
    fetchWeather(city, country, useMock);

});
