const { Sequelize, DataTypes } = require('sequelize');

const pgHost = process.env.POSTGRES_HOST || "localhost"
const pgDatabase = process.env.POSTGRES_DB || "weather"
const pgPassword = process.env.POSTGRES_PASSWORD || "password"
const pgUser = process.env.POSTGRES_USER || "user"

const sequelize = new Sequelize(`postgres://${pgUser}:${pgPassword}@${pgHost}:5432/${pgDatabase}`, {
    pool: {
        max: 25,
        min: 1,
        acquire: 10000,
        idle: 30000
    }
});

const Weather = sequelize.define("Weather", {
    city: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
    },
    weather: {
        type: DataTypes.STRING,
        allowNull: false
    },
    temperature: {
        type: DataTypes.DOUBLE,
        allowNull: false
    },
    nextUpdate: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    sequelize,
    tableName: 'current_weather',
    timestamps: false
});

(async () => {
    await sequelize.sync({ force: true });
    console.log("Database synchronized successfully.");
})();

module.exports = {Weather};
