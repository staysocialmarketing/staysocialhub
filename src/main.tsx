import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Canonical domain redirect — fires before any render
const { hostname, pathname, search, hash } = window.location;
if (hostname !== "hub.staysocial.ca" && hostname !== "localhost" && hostname !== "127.0.0.1") {
  window.location.replace("https://hub.staysocial.ca" + pathname + search + hash);
} else {
  createRoot(document.getElementById("root")!).render(<App />);
}
