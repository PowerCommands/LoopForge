import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ConfirmDialogProvider } from "./components/ui/confirm-dialog";
import { ThemeProvider } from "./components/ThemeProvider";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ConfirmDialogProvider>
        <App />
      </ConfirmDialogProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
