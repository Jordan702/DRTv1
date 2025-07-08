const express = require("express");
const meshRouter = require("./routes/meshRoute");

module.exports = function mountMeshRouterPlugin(basePath = "/mesh-plugin") {
  const router = express.Router();

  // Mount route inside provided path
  router.use("/", meshRouter);

  console.log(`✅ MeshRouter plugin mounted at ${basePath}`);
  return router;
};