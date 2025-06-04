import { useState, useEffect } from "react";

export type Theme = "light" | "dark" | "blue";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fourOneTheme") as Theme;
      return saved || "light";
    }
    return "light";
  });

  // Apply theme immediately on mount
  useEffect(() => {
    const root = document.documentElement;
    
    // Get saved theme on initial load
    const savedTheme = localStorage.getItem("fourOneTheme") as Theme;
    if (savedTheme && savedTheme !== theme) {
      setTheme(savedTheme);
      return;
    }
    
    // Remove all theme classes
    root.classList.remove("dark", "theme-blue");
    
    // Apply theme
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "blue") {
      root.classList.add("theme-blue");
    }
    
    // Save to localStorage
    localStorage.setItem("fourOneTheme", theme);
  }, [theme]);

  // Apply theme immediately when component mounts
  useEffect(() => {
    const root = document.documentElement;
    const savedTheme = localStorage.getItem("fourOneTheme") as Theme;
    
    if (savedTheme) {
      root.classList.remove("dark", "theme-blue");
      if (savedTheme === "dark") {
        root.classList.add("dark");
      } else if (savedTheme === "blue") {
        root.classList.add("theme-blue");
      }
    }
  }, []);

  return { theme, setTheme };
}
