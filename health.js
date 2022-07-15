const OK = {
    status: "UP", 
    checks: [{
        name: "default",
        status: "UP"
    }]
};

const liveness = (_req, res) => {
    res.json(OK)
};

const readiness = (_req, res) => {
    res.json(OK)
};

module.exports = {liveness, readiness};
