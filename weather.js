const axios = require("axios").default;

const weatherUri = process.env.WEATHER_URI || "https://api.openweathermap.org"
const weatherAppid = process.env.WEATHER_APPID || "5b3f51e527ba4ee2ba87940ce9705cb5"

const getWeather = (req, res) => {
    const city = req.query["city"];
    if (!city || city === "") {
        res.status(400).send("The 'city' query parameter needs to be specified.");
        return;
    }

    axios.get("/data/2.5/weather", {
        baseURL: weatherUri, 
        params: {q: city, APPID: weatherAppid}
    })
    .then(function (response) {
        let weather = response.data.weather[0].main;
        if (!weather || weather === "") {
            weather = "Unknown";
        }
        res.json({ city: city, weather: weather }); 
    })
    .catch(function (error) {
        console.log(error);
        res.json({ city: city, weather: "Unknown" }); 
    });    
};

module.exports = { getWeather };
