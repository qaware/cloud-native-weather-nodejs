const axios = require("axios").default;
const database = require("./database")

const weatherUri = process.env.WEATHER_URI || "https://api.openweathermap.org"
const weatherAppid = process.env.WEATHER_APPID || "5b3f51e527ba4ee2ba87940ce9705cb5"

const getWeather = async (req, res) => {
    const city = req.query["city"];
    if (!city || city === "") {
        res.status(400).send("The 'city' query parameter needs to be specified.");
        return;
    }

    const now = Date.now()
    const nextUpdate = new Date(now + ( 3600 * 1000 * 24));
    let currentWeather = await database.Weather.findOne({ where: { city: city } });
    if (currentWeather === null) {
        // retrieve weather from OpenWeatherMap API and create cache
        const weather = await retrieveCurrentWeather(city);
        currentWeather = await database.Weather.create({ city: city, weather: weather, nextUpdate: nextUpdate });
    } else {
        // check if we need to update the current weather
        if (currentWeather.nextUpdate < now) {
            const weather = await retrieveCurrentWeather(city);
            currentWeather = await currentWeather.update({weather: weather, nextUpdate: nextUpdate});
        }
    }  

    // respond with current weather
    res.json({ city: currentWeather.city, weather: currentWeather.weather })
};

const retrieveCurrentWeather = async (city) => {
    console.log('Retrieving current weather for', city);
    let weather = "Unknown";

    await axios.get("/data/2.5/weather", {
        baseURL: weatherUri, 
        params: {q: city, APPID: weatherAppid}
    })
    .then(function (response) {
        weather = response.data.weather[0].main;
    })
    .catch(function (error) {
        console.log(error);
    }); 

    if (!weather || weather === "") {
        weather = "Unknown";
    }

    return weather;
};

module.exports = { getWeather };
