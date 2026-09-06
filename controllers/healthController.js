const mongoose = require("mongoose");

const healthCheck = (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected";

  const serverStatus = dbStatus === "connected" ? "ok" : "error";

  const statusCode = dbStatus === "connected" ? 200 : 503;

  res.status(statusCode).json({
    status: serverStatus,
    database: dbStatus,
    message:
      dbStatus === "connected"
        ? "Server and database are healthy"
        : "Server is running but database is disconnected",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  healthCheck,
};