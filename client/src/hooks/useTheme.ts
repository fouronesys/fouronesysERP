import { useState, useEffect } from "react";

export type Theme = "light" | "dark" | "blue";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("fourOneTheme") as Theme) || "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    
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

  return { theme, setTheme };
}
