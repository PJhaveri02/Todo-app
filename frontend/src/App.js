import {
  Container,
  Typography,
  AppBar,
  Toolbar,
  makeStyles,
} from "@material-ui/core";
import TodoList from "./components/TodoList";
import { useAuth0 } from "@auth0/auth0-react";
import { LogoutButton } from "./components/LogoutButton";
import { useEffect } from "react";

const useStyles = makeStyles((theme) => ({
  main: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
}));

function App() {
  const classes = useStyles();
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  // If user is not logged in them redirect them to login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  return (
    <>
      <div>
        {!isLoading && isAuthenticated && (
          <AppBar position="fixed">
            <Toolbar>
              <Typography variant="h6">My Todos</Typography>
              <LogoutButton />
            </Toolbar>
          </AppBar>
        )}
        {!isLoading && isAuthenticated && (
          <Container fixed>
            <Toolbar />
            <main className={classes.main}>
              <TodoList />
            </main>
          </Container>
        )}
      </div>
    </>
  );
}

export default App;
