import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { loadBranding, applyTheme } from "./lib/branding";
import { initOfflineSync } from "./lib/offlineQueue";

// Apply persisted theme color before first paint to avoid flash.
const b = loadBranding();
applyTheme(b.themeHue, b.themeSat);
initOfflineSync();

createRoot(document.getElementById("root")!).render(<App />);
