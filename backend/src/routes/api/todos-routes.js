import express from "express";
import * as todosDao from "../../db/todos-dao";
import mongoose from "mongoose";

// Imports for protected routes
import jwt from "express-jwt";
import jwksRsa from "jwks-rsa";

// Import dotenv package so project can have multiple .env files
require("dotenv").config({ path: `${__dirname}/./../../../.env` });

//Code for authorisation middleware
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URI,
  }),

  // Validate the audience and the issuer.
  audience: process.env.AUTH0_AUDIENCE,
  issuer: process.env.AUTH0_ISSUER,
  algorithms: ["RS256"],
});

// const HTTP_OK = 200; // Not really needed; this is the default if you don't set something else.
const HTTP_CREATED = 201;
export const HTTP_NOT_FOUND = 404;
export const HTTP_NO_CONTENT = 204;
const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORISED = 401;

const router = express.Router();

/**
 * A trick to include the check for a valid id in one place, rather than in every single method that needs it.
 * If "next()" is called, the next route below that matches will be called. Otherwise, we just end the response.
 * The "use()" function will match ALL HTTP request method types (i.e. GET, PUT, POST, DELETE, etc).
 */
router.use("/:id", checkJwt, async (req, res, next) => {
  const { id } = req.params;
  if (mongoose.isValidObjectId(id)) {
    next();
  } else {
    res.status(HTTP_BAD_REQUEST).contentType("text/plain").send("Invalid ID");
  }
});

// Create todo
router.post("/", checkJwt, async (req, res) => {
  if (!req.body.title) {
    res
      .status(HTTP_BAD_REQUEST)
      .contentType("text/plain")
      .send("New todos must have a title");
    return;
  }

  const uniqueID = req.user.sub;
  const todoWithUserID = { ...req.body, userID: uniqueID };
  const newTodo = await todosDao.createTodo(todoWithUserID);
  res
    .status(HTTP_CREATED)
    .header("location", `/api/todos/${newTodo._id}`)
    .json(newTodo);
});

// Retrieve todo list
router.get("/", checkJwt, async (req, res) => {
  const uniqueID = req.user.sub;
  res.json(await todosDao.retrieveAllTodos(uniqueID));
});

// Retrieve single todo
router.get("/:id", checkJwt, async (req, res) => {
  const { id } = req.params;
  const uniqueID = req.user.sub;
  const todo = await todosDao.retrieveTodo(id);

  if (todo) {
    if (todo.userID !== uniqueID) {
      res.sendStatus(HTTP_UNAUTHORISED);
    } else {
      res.json(todo);
    }
  } else {
    res.sendStatus(HTTP_NOT_FOUND);
  }
});

// Update todo
router.put("/:id", checkJwt, async (req, res) => {
  const { id } = req.params;
  const uniqueID = req.user.sub;
  const todo = {
    ...req.body,
    _id: id,
    userID: uniqueID,
  };
  const status = await todosDao.updateTodo(todo);
  res.sendStatus(status);
});

// Delete todo
router.delete("/:id", checkJwt, async (req, res) => {
  const { id } = req.params;
  const uniqueID = req.user.sub;
  const success = await todosDao.deleteTodo(id, uniqueID);
  res.sendStatus(success ? HTTP_NO_CONTENT : HTTP_UNAUTHORISED);
});

export default router;
