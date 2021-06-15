import React from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "@material-ui/core";

export const LogoutButton = () => {
  const { logout } = useAuth0();
  return (
    <>
      <Button
        variant="contained"
        onClick={() => logout()}
        style={{
          position: "absolute",
          right: "5px",
        }}
      >
        Log Out
      </Button>
    </>
  );
};
