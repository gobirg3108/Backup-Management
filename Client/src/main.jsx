import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { Toaster } from "react-hot-toast";

import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,

          style: {
            fontSize: "18px",
            padding: "16px",
            borderRadius: "12px",
            background: "#111827",
            color: "#fff",
          },

          success: {
            iconTheme: {
              primary: "green",
              secondary: "white",
            },
          },

          error: {
            iconTheme: {
              primary: "red",
              secondary: "white",
            },
          },
        }}
      />
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
