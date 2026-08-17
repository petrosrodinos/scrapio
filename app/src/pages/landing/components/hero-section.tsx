import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { InspectorPanel } from "./inspector-panel";

export const HeroSection: FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
      <div aria-hidden className="landing-grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <span className="landing-display inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] uppercase tracking-wider text-muted">
            self-driving web scrapers
          </span>

          <h1 className="landing-display mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Point it at a page.
            <br />
            Get the data. <span className="text-accent">Forever.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Scrapio sends a computer-use AI agent into a real browser to click, scroll, and read a
            page the way a person would — then turns what it finds into clean, schema-validated
            data. When the site changes and the scraper breaks, the same agent rebuilds it. No one
            gets paged.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {isLoggedIn ? (
              <Button
                variant="primary"
                size="lg"
                onPress={() => navigate(Routes.dashboard.root)}
                className="w-full sm:w-auto"
              >
                Go to dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  onPress={() => navigate(Routes.auth.sign_up)}
                  className="w-full sm:w-auto"
                >
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => navigate(Routes.auth.sign_in)}
                  className="w-full sm:w-auto"
                >
                  Sign in
                </Button>
              </>
            )}
          </div>

          <p className="mt-4 text-xs text-muted">
            Bring your own OpenAI, Anthropic, Gemini, or DeepSeek key — you control the AI spend.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-5xl">
          <InspectorPanel />
        </div>
      </div>
    </section>
  );
};
