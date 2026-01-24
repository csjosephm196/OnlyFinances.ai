
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/globals.css";
import { ThemeProvider } from "./context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
