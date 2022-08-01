const axios = require("axios").default;
const database = require("./database");

const weatherUri = process.env.WEATHER_URI || "https://api.openweathermap.org";
const weatherAppid = process.env.WEATHER_APPID || "5b3f51e527ba4ee2ba87940ce9705cb5";

const KelvinToCelsius = 273.15;

const getWeather = async (req, res) => {
    const city = req.query["city"];
    if (!city || city === "") {
        res.status(400).send("The 'city' query parameter needs to be specified.");
        return;
    }

    const now = Date.now()
    const nextUpdate = new Date(now + ( 3600 * 1000 * 1));
    let currentWeather = await database.Weather.findOne({ where: { city: city } });
    if (currentWeather === null) {
        // retrieve weather from OpenWeatherMap API and create cache
        const liveWeather = await retrieveCurrentWeather(city);
        currentWeather = await database.Weather.create({ city: city, weather: liveWeather.weather, temperature: liveWeather.temperature, nextUpdate: nextUpdate });
    } else {
        // check if we need to update the current weather
        if (currentWeather.next1pdate < now) {
            const liveWeather = await retrieveCurrentWeather(city);
            currentWeather = await currentWeather.update({weather: liveWeather.weather, temperature: liveWeather.temperature, nextUpdate: nextUpdate});
        }
    }  

    // respond with current weather
    res.json({ city: currentWeather.city, weather: currentWeather.weather, temperature: currentWeather.temperature })
};

const retrieveCurrentWeather = async (city) => {
    console.log('Retrieving current weather for', city);
    let weather = {weather: "Unknown", temperature: 0.0};

    await axios.get("/data/2.5/weather", {
        baseURL: weatherUri, 
        params: {q: city, APPID: weatherAppid}
    })
    .then(function (response) {
        weather = {weather: response.data.weather[0].main, temperature: response.data.main.temp - KelvinToCelsius};
    })
    .catch(function (error) {
        console.log(error);
    }); 

    return weather;
};

module.exports = { getWeather };
