import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeContext } from "./ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { theme, setTheme } = useThemeContext();
  const { user } = useAuth();

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-gray-800 theme-blue:bg-gradient-to-r theme-blue:from-blue-600 theme-blue:to-blue-700 border-b border-gray-200 dark:border-gray-700 theme-blue:border-blue-500 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white theme-blue:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 theme-blue:text-blue-100">
              {subtitle}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("light")}
              className="text-xs"
            >
              Claro
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("dark")}
              className="text-xs"
            >
              Oscuro
            </Button>
            <Button
              variant={theme === "blue" ? "default" : "outline"}
              size="sm"
              onClick={() => setTheme("blue")}
              className="text-xs"
            >
              Azul
            </Button>
          </div>

          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Factura
          </Button>
          
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 theme-blue:text-blue-100 theme-blue:hover:text-white">
              <Bell className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 theme-blue:text-white">
                {user?.firstName && user?.lastName 
                  ? `${user.firstName} ${user.lastName}` 
                  : user?.email || "Usuario"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
