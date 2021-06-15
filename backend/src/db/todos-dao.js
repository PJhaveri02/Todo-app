/**
 * This file contains functions which interact with MongoDB, via mongoose, to perform Todo-related
 * CRUD operations.
 */

import {
  HTTP_NOT_FOUND,
  HTTP_NO_CONTENT,
  HTTP_UNAUTHORISED,
} from "../routes/api/todos-routes";
import { Todo } from "./todos-schema";

// No need to modify here, as user check will be done in todos-routes.js file
export async function createTodo(todo) {
  const dbTodo = new Todo(todo);
  await dbTodo.save();
  return dbTodo;
}

// Modified to allow for only users to get their own todos
export async function retrieveAllTodos(userID) {
  return await Todo.find({ userID: userID });
}

// No need to modify here, as user check will be done in todos-routes.js file
export async function retrieveTodo(id) {
  return await Todo.findById(id);
}

// Modified to ensure user only updates their own todos
export async function updateTodo(todo) {
  const currentTodo = await Todo.findById(todo._id);
  if (!currentTodo) {
    return HTTP_NOT_FOUND;
  } else if (currentTodo.userID !== todo.userID) {
    return HTTP_UNAUTHORISED;
  }

  const result = await Todo.findByIdAndUpdate(todo._id, todo, {
    new: true,
    useFindAndModify: false,
  });
  return result ? HTTP_NO_CONTENT : HTTP_NOT_FOUND;
}

// Modified to ensure user can only delete their todos
export async function deleteTodo(id, userID) {
  const todo = await Todo.findById(id);
  if (todo && todo.userID !== userID) {
    return false;
  }
  await Todo.deleteOne({ _id: id });
  return true;
}
