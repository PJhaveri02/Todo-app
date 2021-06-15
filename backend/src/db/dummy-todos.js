import dayjs from "dayjs";

export const dummyTodos = [
  {
    title: "Prepare lab 04",
    description: "Complete writing the model solution for the lab exercises.",
    userID: "google-oauth2|114176885094891026350",
    isComplete: false,
    dueDate: dayjs("2021-03-19T20:00").toDate(),
  },
  {
    title: "Do the stuff",
    userID: "google-oauth2|114176885094891026342",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    isComplete: true,
    dueDate: dayjs().add(2, "day").toDate(),
  },
  {
    title: "Build the things",
    userID: "google-oauth2|214176885094891026350",
    isComplete: false,
    dueDate: dayjs().subtract(1, "week").toDate(),
  },
  {
    title: "Charge the flux capacitors",
    userID: "google-oauth2|114176885094891026350",
    description:
      "We can literally do this whenever - once we're done, we can travel back in time to whenever we want.",
    isComplete: false,
    dueDate: dayjs().subtract(100, "year").toDate(),
  },
];
