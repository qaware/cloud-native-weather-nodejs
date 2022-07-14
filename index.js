const express = require("express");
const favicon = require("serve-favicon");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const limit = require("express-rate-limit");
const weather = require("./weather")
const health = require("./health")

// define main app with middlewares
// deepcode ignore UseCsurfForExpress: No CSRF protection required
const app = express();
app.use(favicon("favicon.ico"));
app.use(morgan("combined"));
app.use(helmet());
app.use(cors());
app.use(limit({
    windowMs: 60 * 1000, // 60 minutes
    max: 128, // limit each IP to 128 requests per windowMs
    message: "Too many requests. Please try again after one minute."
}));

// define the API endpoints
app.get('/api/weather', weather.getWeather);
app.get('/health/live', health.liveness);
app.get('/health/ready', health.readiness);

const host = process.env.HOST || "localhost";
const port = process.env.PORT || 3000;

const server = app.listen(port, host, () => {
    console.log(`Started weather service on http://${host}:${port}`)
});

const shutdown = () => {
    console.log('Stopping weather service ...');
    server.close(() => {
        console.log('Stopped weather service');
    });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
