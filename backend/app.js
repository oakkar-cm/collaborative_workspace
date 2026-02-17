const express = require("express");
const cors = require("cors");
const mountRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(cors());

mountRoutes(app);

app.use(errorHandler);

module.exports = app;
