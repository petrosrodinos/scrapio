import type { FC } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { Sun, Moon } from "lucide-react";
import { AppLogo } from "@/components/ui/app-logo";
import { Routes } from "@/routes/routes";
import { useThemeContext } from "@/components/providers/theme-provider";
import { useAuthStore } from "@/stores/auth";

export const LandingNavbar: FC = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeContext();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to={Routes.landing.root} className="flex items-center">
          <AppLogo
            showWordmark
            markClassName="h-7 w-7"
            wordmarkClassName="landing-display text-[15px]"
          />
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-secondary hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {isLoggedIn ? (
            <Button variant="primary" size="sm" onPress={() => navigate(Routes.dashboard.root)}>
              Go to dashboard
            </Button>
          ) : (
            <>
              <button
                onClick={() => navigate(Routes.auth.sign_in)}
                className="hidden rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground sm:inline-flex"
              >
                Sign in
              </button>
              <Button variant="primary" size="sm" onPress={() => navigate(Routes.auth.sign_up)}>
                Get started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
