
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Apply saved theme before first render to avoid flash
  const savedTheme = localStorage.getItem('theme') ?? 'dark';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  createRoot(document.getElementById("root")!).render(<App />);
  