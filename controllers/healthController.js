const healthCheck = (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  healthCheck,
};