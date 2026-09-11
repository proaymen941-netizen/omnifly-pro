import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

// Gracefully suppress benign Vite HMR WebSocket closed notices in sandboxed preview / dev mode
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason &&
      (String(event.reason).includes("WebSocket") ||
        String(event.reason?.message).includes("WebSocket"))
    ) {
      event.preventDefault();
    }
  });
}

setBaseUrl("");

setAuthTokenGetter(() => {
  return localStorage.getItem("pos_token");
});

const root = document.getElementById("root");
if (root) {
  root.setAttribute("dir", "rtl");
}

createRoot(root!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
