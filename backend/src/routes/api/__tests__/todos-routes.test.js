import routes from '../todos-routes';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import express from 'express';
import axios from 'axios';
import connectToDatabase from '../../../db/db-connect';
import { Todo } from '../../../db/todos-schema';
import dayjs from 'dayjs';

let mongod, app, server, token;

// jest.setTimeout(100000);

// Some dummy data to test with
const overdueTodo = {
  _id: new mongoose.mongo.ObjectId('000000000000000000000002'),
  title: 'OverdueTitle',
  description: 'OverdueDesc',
  isComplete: false,
  dueDate: dayjs().subtract(1, 'day').format(),
};

const upcomingTodo = {
  _id: new mongoose.mongo.ObjectId('000000000000000000000003'),
  title: 'UpcomingTitle',
  description: 'UpcomingDesc',
  isComplete: false,
  dueDate: dayjs().add(1, 'day').format(),
};

const completeTodo = {
  _id: new mongoose.mongo.ObjectId('000000000000000000000004'),
  title: 'CompleteTitle',
  description: 'CompleteDesc',
  isComplete: true,
  dueDate: dayjs().format(),
};

const otherUserTodo = {
  _id: new mongoose.mongo.ObjectId('000000000000000000000005'),
  title: 'Todo for other User',
  description: 'Todo called for three tests',
  isComplete: true,
  dueDate: dayjs().subtract(3, 'day').format(),
  userID: 'randomIdOfUserToCheck401Error',
};

const dummyTodos = [overdueTodo, upcomingTodo, completeTodo];

// Helper function to get user token
async function getToken() {
  const options = {
    url: process.env.AUTH0_URL,
    method: 'post',
    data: {
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: process.env.AUTH0_AUDIENCE,
      grant_type: process.env.AUTH0_GRANT_TYPE,
    },
  };

  const res = await axios(options);
  token = res.data.access_token;
}

/**
 * Helper function that shallow compares two objects
 * @returns true if objects are same, otherwise, false
 */
const shallowEqual = (object1, object2) => {
  const keysOfObject1 = Object.keys(object1);
  const keysOfObject2 = Object.keys(object2);

  if (keysOfObject1.length !== keysOfObject2.length) {
    return false;
  }

  for (let key of keysOfObject1) {
    if (object1[key] !== object2[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Helper function to check whether the database has changes
 * Returns true if database is not changed, otherwise, returns false
 */
const databaseUnchanged = async (expectedNumberOfTodos) => {
  const numberOfTodos = await Todo.countDocuments();

  if (numberOfTodos !== expectedNumberOfTodos) {
    return false;
  }

  const todosInDB =
    expectedNumberOfTodos > dummyTodos.length ? [...dummyTodos, otherUserTodo] : dummyTodos;

  for (let i = 0; i < todosInDB.length; i++) {
    const expectedTodo = todosInDB[i];
    const actualTodo = await Todo.findOne({ _id: expectedTodo._id });

    if (
      !actualTodo ||
      expectedTodo.title !== actualTodo.title ||
      expectedTodo.description !== actualTodo.description ||
      expectedTodo.isComplete !== actualTodo.isComplete ||
      shallowEqual(dayjs(expectedTodo.dueDate), dayjs(actualTodo.dueDate))
    ) {
      return false;
    }
  }

  return true;
};

const generateTodoForOtherUser = async () => {
  const dbTodo = new Todo(otherUserTodo);
  await dbTodo.save();
};

// Start database and server before any tests run
beforeAll(async (done) => {
  mongod = new MongoMemoryServer();

  await mongod.getUri().then((cs) => connectToDatabase(cs));

  // Function to get user's token to they can access the database
  await getToken();

  app = express();
  app.use(express.json());
  app.use('/api/todos', routes);
  server = app.listen(3000, done);
});

// Populate database with dummy data before each test (dummy data now includes userID)
beforeEach(async () => {
  for (let i = 0; i < dummyTodos.length; i++) {
    await axios.post('http://localhost:3000/api/todos', dummyTodos[i], {
      headers: {
        Authorization: `Bearer ${token}`, //the token is a variable which holds the token
      },
    });
  }
});

// Clear database after each test
afterEach(async () => {
  await Todo.deleteMany({});
});

// Stop db and server before we finish
afterAll((done) => {
  server.close(async () => {
    await mongoose.disconnect();
    await mongod.stop();
    done();
  });
});

it('retrieves all todos successfully', async () => {
  const response = await axios.get('http://localhost:3000/api/todos', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.status).toBe(200);
  const responseTodos = response.data;
  expect(responseTodos.length).toBe(3);

  for (let i = 0; i < responseTodos.length; i++) {
    const responseTodo = responseTodos[i];
    const expectedTodo = dummyTodos[i];

    expect(responseTodo._id.toString()).toEqual(expectedTodo._id.toString());
    expect(responseTodo.title).toEqual(expectedTodo.title);
    expect(responseTodo.description).toEqual(expectedTodo.description);
    expect(responseTodo.isComplete).toEqual(expectedTodo.isComplete);
    expect(dayjs(responseTodo.dueDate)).toEqual(dayjs(expectedTodo.dueDate));
  }
});

it('retrieves a single todo successfully', async () => {
  const response = await axios.get('http://localhost:3000/api/todos/000000000000000000000003', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.status).toBe(200);

  const responseTodo = response.data;
  expect(responseTodo._id.toString()).toEqual(upcomingTodo._id.toString());
  expect(responseTodo.title).toEqual(upcomingTodo.title);
  expect(responseTodo.description).toEqual(upcomingTodo.description);
  expect(responseTodo.isComplete).toEqual(upcomingTodo.isComplete);
  expect(dayjs(responseTodo.dueDate)).toEqual(dayjs(upcomingTodo.dueDate));
});

it('returns a 404 when attempting to retrieve a nonexistant todo (valid id)', async () => {
  try {
    await axios.get('http://localhost:3000/api/todos/000000000000000000000001', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fail('Should have thrown an exception.');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(404);
  }
});

it('returns a 400 when attempting to retrieve a nonexistant todo (invalid id)', async () => {
  try {
    await axios.get('http://localhost:3000/api/todos/blah', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fail('Should have thrown an exception.');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(400);
    expect(response.data).toBe('Invalid ID');
  }
});

it('Creates a new todo', async () => {
  const newTodo = {
    title: 'NewTodo',
    description: 'NewDesc',
    isComplete: false,
    dueDate: dayjs('2100-01-01').format(),
  };

  const response = await axios.post('http://localhost:3000/api/todos', newTodo, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Check response is as expected
  expect(response.status).toBe(201);
  expect(response.data).toBeDefined();
  const rTodo = response.data;
  expect(rTodo.title).toBe('NewTodo');
  expect(rTodo.description).toBe('NewDesc');
  expect(rTodo.isComplete).toBe(false);
  expect(dayjs(rTodo.dueDate)).toEqual(dayjs('2100-01-01'));
  expect(rTodo._id).toBeDefined();
  expect(response.headers.location).toBe(`/api/todos/${rTodo._id}`);

  // Check that the todo was actually added to the database
  const dbTodo = await Todo.findById(rTodo._id);
  expect(dbTodo.title).toBe('NewTodo');
  expect(dbTodo.description).toBe('NewDesc');
  expect(dbTodo.isComplete).toBe(false);
  expect(dayjs(dbTodo.dueDate)).toEqual(dayjs('2100-01-01'));
});

it('Gives a 400 when trying to create a todo with no title', async () => {
  try {
    const newTodo = {
      description: 'NewDesc',
      isComplete: false,
      dueDate: dayjs('2100-01-01').format(),
    };

    await axios.post('http://localhost:3000/api/todos', newTodo, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fail('Should have thrown an exception.');
  } catch (err) {
    // Ensure response is as expected
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(400);

    // Ensure DB wasn't modified
    expect(await Todo.countDocuments()).toBe(3);
  }
});

it('updates a todo successfully', async () => {
  const toUpdate = {
    _id: new mongoose.mongo.ObjectId('000000000000000000000004'),
    title: 'UPDCompleteTitle',
    description: 'UPDCompleteDesc',
    isComplete: false,
    dueDate: dayjs('2100-01-01').format(),
  };

  const response = await axios.put(
    'http://localhost:3000/api/todos/000000000000000000000004',
    toUpdate,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Check response
  expect(response.status).toBe(204);

  // Ensure DB was updated
  const dbTodo = await Todo.findById('000000000000000000000004');
  expect(dbTodo.title).toBe('UPDCompleteTitle');
  expect(dbTodo.description).toBe('UPDCompleteDesc');
  expect(dbTodo.isComplete).toBe(false);
  expect(dayjs(dbTodo.dueDate)).toEqual(dayjs('2100-01-01'));
});

it('Uses the path ID instead of the body ID when updating', async () => {
  const toUpdate = {
    _id: new mongoose.mongo.ObjectId('000000000000000000000003'),
    title: 'UPDCompleteTitle',
    description: 'UPDCompleteDesc',
    isComplete: false,
    dueDate: dayjs('2100-01-01').format(),
  };

  const response = await axios.put(
    'http://localhost:3000/api/todos/000000000000000000000004',
    toUpdate,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  // Check response
  expect(response.status).toBe(204);

  // Ensure correct DB entry was updated
  let dbTodo = await Todo.findById('000000000000000000000004');
  expect(dbTodo.title).toBe('UPDCompleteTitle');
  expect(dbTodo.description).toBe('UPDCompleteDesc');
  expect(dbTodo.isComplete).toBe(false);
  expect(dayjs(dbTodo.dueDate)).toEqual(dayjs('2100-01-01'));

  // Ensure incorrect DB entry was not updated
  dbTodo = await Todo.findById('000000000000000000000003');
  expect(dbTodo.title).toBe('UpcomingTitle');
  expect(dbTodo.description).toBe('UpcomingDesc');
  expect(dbTodo.isComplete).toBe(false);
  expect(dayjs(dbTodo.dueDate)).toEqual(dayjs(upcomingTodo.dueDate));
});

it('Gives a 404 when updating a nonexistant todo', async () => {
  try {
    const toUpdate = {
      _id: new mongoose.mongo.ObjectId('000000000000000000000010'),
      title: 'UPDCompleteTitle',
      description: 'UPDCompleteDesc',
      isComplete: false,
      dueDate: dayjs('2100-01-01').format(),
    };

    await axios.put('http://localhost:3000/api/todos/000000000000000000000010', toUpdate, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fail('Should have returned a 404');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(404);

    // Make sure something wasn't added to the db
    expect(await Todo.countDocuments()).toBe(3);
  }
});

it('Deletes a todo', async () => {
  const response = await axios.delete('http://localhost:3000/api/todos/000000000000000000000003', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.status).toBe(204);

  // Check db item was deleted
  expect(await Todo.findById('000000000000000000000003')).toBeNull();
});

it("Doesn't delete anything when it shouldn't", async () => {
  const response = await axios.delete('http://localhost:3000/api/todos/000000000000000000000010', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.status).toBe(204);

  // Make sure something wasn't deleted from the db
  expect(await Todo.countDocuments()).toBe(3);
});

it('401 status sent when user is UNAUTHORISED and tries to GET all todos', async () => {
  try {
    await axios.get('http://localhost:3000/api/todos');
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(3)).toBe(true);
  }
});

it('401 status sent when user is UNAUTHORISED and tries to GET a todo', async () => {
  try {
    await axios.get('http://localhost:3000/api/todos/000000000000000000000004');
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(3)).toBe(true);
  }
});

it('401 status sent when user is UNAUTHORISED and tries to DELETE a todo', async () => {
  try {
    await axios.delete('http://localhost:3000/api/todos/000000000000000000000003');
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(3)).toBe(true);
  }
});

it('401 status sent when user is UNAUTHORISED and tries to CREATE a todo', async () => {
  try {
    const newTodo = {
      title: 'NewTodo',
      description: 'Trying to add new todo',
      isComplete: false,
      dueDate: dayjs('2100-01-01').format(),
    };

    await axios.post('http://localhost:3000/api/todos', newTodo);
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(3)).toBe(true);
  }
});

it('401 status sent when user is UNAUTHORISED and tries to UPDATE a todo', async () => {
  try {
    const toUpdate = {
      _id: new mongoose.mongo.ObjectId('000000000000000000000004'),
      title: 'UPDCompleteTitle',
      description: 'UPDCompleteDesc',
      isComplete: false,
      dueDate: dayjs('2100-01-01').format(),
    };

    await axios.put('http://localhost:3000/api/todos/000000000000000000000004', toUpdate);
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(3)).toBe(true);
  }
});

it("401 is returned when trying to GET a todo item that doesn't belong to the currently authenticated user", async () => {
  try {
    // Create a Todo that represents another user
    await generateTodoForOtherUser();

    await axios.get('http://localhost:3000/api/todos/000000000000000000000005', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(4)).toBe(true);
  }
});

it("401 is returned when trying to PUT (update) a todo item that doesn't belong to the currently authenticated user", async () => {
  try {
    // Create a Todo that represents another user
    await generateTodoForOtherUser();

    const otherUserTodo = {
      _id: new mongoose.mongo.ObjectId('000000000000000000000005'),
      title: 'Updated - Todo for other User',
      description: 'Todo called for three tests Updated',
      isComplete: false,
      dueDate: dayjs().subtract(15, 'day').format(),
    };

    await axios.put('http://localhost:3000/api/todos/000000000000000000000005', otherUserTodo, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(4)).toBe(true);
  }
});

it("401 is returned when trying to DELETE a todo item that doesn't belong to the currently authenticated user", async () => {
  try {
    // Create a Todo that represents another user
    await generateTodoForOtherUser();

    await axios.delete('http://localhost:3000/api/todos/000000000000000000000005', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    fail('Should have returned 401');
  } catch (err) {
    const { response } = err;
    expect(response).toBeDefined();
    expect(response.status).toBe(401);

    // Check if database is unchanged
    expect(await databaseUnchanged(4)).toBe(true);
  }
});
