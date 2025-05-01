document.addEventListener('DOMContentLoaded', function () {
  // API information
  const API_KEY = '3bad52890d7306cc268371520cbaace6';
  const BASE_URL = 'https://api.openweathermap.org/data/2.5/forecast';

  // List of default cities
  const cities = ['Stockholm', 'Gothenburg', 'Oslo'];
  let weeklyForecast = {};
  let currentCityIndex = 0;

  // Function to fetch weather data from the API
  async function fetchWeather(city) {
    try {
      const response = await fetch(`${BASE_URL}?q=${city}&units=metric&appid=${API_KEY}`);
      const data = await response.json();

      if (data.cod !== "200") {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      console.error(`Error fetching weather data for ${city}:`, error);
      return null;
    }
  }

  // Function to get the day name from a date
  function getDayName(dateString) {
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  async function fetchAndStoreWeather(city) {
    const data = await fetchWeather(city);
    if (!data || !data.list) {
      return;
    }


    // Extract today's forecast 
    const todayData = data.list.find(entry => entry.dt_txt.includes("12:00:00")) || data.list[0];
    const todayDate = todayData.dt_txt.split(" ")[0]; // Extract 'YYYY-MM-DD'
    const sunriseTime = new Date(data.city.sunrise * 1000).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    const sunsetTime = new Date(data.city.sunset * 1000).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

    // Create today's forecast object
    const todayForecast = {
      city: data.city.name,
      day: getDayName(todayDate),
      weather: todayData.weather[0].description,
      icon: todayData.weather[0].icon,
      temp: todayData.main.temp,
      wind: todayData.wind.speed,
      sunrise: sunriseTime,
      sunset: sunsetTime,
    };

    // 4-day forecast. Group forecast entries by day to get one entry per day
    const dailyForecasts = {};

    data.list.forEach(entry => {
      const date = entry.dt_txt.split(' ')[0];
      const hour = entry.dt_txt.split(' ')[1].split(':')[0];

      // Use noon (12:00) forecasts for consistency
      if (hour === '12') {
        // Skip today's date
        if (date !== todayDate) {
          dailyForecasts[date] = {
            date: date,
            day: getDayName(date),
            icon: entry.weather[0].icon,
            weather: entry.weather[0].description,
            temp: entry.main.temp,
            wind: entry.wind.speed,
          };
        }
      }
    });

    // Convert to array and take the first 4 days
    const upcomingForecast = Object.values(dailyForecasts).slice(0, 4);

    // Store forecasts
    weeklyForecast[city] = {
      today: todayForecast,
      upcoming: upcomingForecast
    };

    // Store in localStorage for persistence
    localStorage.setItem("weatherData", JSON.stringify(weeklyForecast));

    // Update UI
    displayTodaysWeather(todayForecast);
    displayWeeklyWeather(upcomingForecast);

    // Set background based on weather
    updateBackground(todayForecast.weather, todayForecast.icon);
  }

  // Function to display today's weather in the UI
  function displayTodaysWeather(forecast) {
    const weatherContent = document.getElementById('weather-content');
    if (!weatherContent) return;

    // Create HTML with the OpenWeatherMap icon
    weatherContent.innerHTML = `
      <div class="weather-icon">
        <img id="main-icon" src="https://openweathermap.org/img/wn/${forecast.icon}@2x.png" alt="${forecast.weather}">
      </div>
      <p id="temperature">${Math.round(forecast.temp)}°C</p>
      <p id="city">${forecast.city}</p>
      <p id="weather">${forecast.weather}</p>
      <div class="sunrise-sunset">
        <p id="sunrise">Sunrise: ${forecast.sunrise}</p>
        <p id="sunset">Sunset: ${forecast.sunset}</p>
      </div>
    `;
  }

  // Function to display the weekly forecast in the UI
  function displayWeeklyWeather(forecastList) {
    const forecastTable = document.querySelector("#weather-forecast table");
    if (!forecastTable) return;

    const rows = forecastTable.getElementsByTagName("tr");
    if (!rows || rows.length === 0) return;

    forecastList.forEach((forecast, index) => {
      if (index < rows.length) {
        // Update day
        const dayCell = rows[index].querySelector(`#day${index + 1}`);
        if (dayCell) {
          dayCell.textContent = forecast.day;
        }

        // Update icon using OpenWeatherMap icon
        const iconCell = rows[index].querySelector(`#iconday${index + 1}`);
        if (iconCell) {
          iconCell.innerHTML = `<img src="https://openweathermap.org/img/wn/${forecast.icon}.png" alt="${forecast.weather}">`;
        }

        // Update temp and wind
        const tempCell = rows[index].querySelector(`#tempday${index + 1}`);
        if (tempCell) {
          tempCell.textContent = `${Math.round(forecast.temp)}°C`;
        }

        const windCell = rows[index].querySelector(`#windday${index + 1}`);
        if (windCell) {
          windCell.textContent = `${forecast.wind} m/s`;
        }
      }
    });
  }

  // Function to update the background based on weather conditions
  function updateBackground(weatherDescription, iconCode) {
    const container = document.querySelector('.container');
    if (!container) return;

    // Remove previous weather classes
    container.classList.remove('rainy', 'cloudy', 'clear', 'snowy', 'daytime', 'nighttime');

    // Determine if it's day or night from the icon code (ends with d for day, n for night)
    const isDaytime = iconCode.endsWith('d');
    container.classList.add(isDaytime ? 'daytime' : 'nighttime');

    // Add appropriate weather class
    if (weatherDescription.includes('rain') || weatherDescription.includes('drizzle')) {
      container.classList.add('rainy');
    } else if (weatherDescription.includes('cloud')) {
      container.classList.add('cloudy');
    } else if (weatherDescription.includes('clear')) {
      container.classList.add('clear');
    } else if (weatherDescription.includes('snow')) {
      container.classList.add('snowy');
    }
  }

  // Function to cycle through default cities
  function cycleCity() {
    currentCityIndex = (currentCityIndex + 1) % cities.length;
    const city = cities[currentCityIndex];
    fetchAndStoreWeather(city);
  }


  // Event listeners
  function initializeEventListeners() {
    const searchButton = document.getElementById("search-button");
    const inputField = document.getElementById("input-field");
    const nextSideButton = document.getElementById('next-side-button');

    if (searchButton) {
      searchButton.addEventListener("click", function () {
        if (inputField && inputField.value.trim()) {
          fetchAndStoreWeather(inputField.value.trim());
        }
      });
    }

    if (inputField) {
      inputField.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && inputField.value.trim()) {
          fetchAndStoreWeather(inputField.value.trim());
        }
      });
    }

    if (nextSideButton) {
      nextSideButton.addEventListener('click', cycleCity);
    } else {
      console.error("Could not find button with ID 'next-side-button'");
    }
  }


  initializeEventListeners();
  fetchAndStoreWeather("Stockholm");

  const savedData = localStorage.getItem("weatherData");
  if (savedData) {
    try {
      weeklyForecast = JSON.parse(savedData);
    } catch (e) {
      console.error("Failed to parse saved weather data:", e);
    }
  }
});


