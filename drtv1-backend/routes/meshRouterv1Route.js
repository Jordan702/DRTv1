const express = require("express");
const router = express.Router();
const meshRouterv1Controller = require("../controllers/meshRouterv1Controller");

router.get("/mesh-route", meshRouterv1Controller.getMeshRoute);

module.exports = router;
