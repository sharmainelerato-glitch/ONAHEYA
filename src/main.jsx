
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ResetPassword from "./ResetPassword";
import "./App.css";

const isPasswordReset =
  window.location.pathname === "/reset-password";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isPasswordReset ? <ResetPassword /> : <App />}
  </React.StrictMode>
);
