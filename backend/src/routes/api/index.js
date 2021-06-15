import express from "express";

const router = express.Router();
const HTTP_UNAUTHORISED = 401;

import todos from "./todos-routes";
router.use("/todos", todos);

// Used to catch error when user is not autherised
router.use(async (err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    res.sendStatus(HTTP_UNAUTHORISED);
  }
});

export default router;
