import type { FC } from "react";
import { Link } from "react-router-dom";
import { Routes } from "@/routes/routes";
import { environments } from "@/config/environments";
import { useAuthStore } from "@/stores/auth";
import { AppLogo } from "@/components/ui/app-logo";

export const LandingFooter: FC = () => {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <AppLogo markClassName="h-6 w-6" />
          <div>
            <p className="landing-display text-sm font-semibold text-foreground">
              {environments.APP_NAME}
            </p>
            <p className="text-xs text-muted">Self-driving web scrapers.</p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-sm text-muted">
          {isLoggedIn ? (
            <Link to={Routes.dashboard.root} className="hover:text-foreground">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to={Routes.auth.sign_in} className="hover:text-foreground">
                Sign in
              </Link>
              <Link to={Routes.auth.sign_up} className="hover:text-foreground">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
};
