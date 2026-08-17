import type { FC } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { Routes } from "@/routes/routes";
import { useAuthStore } from "@/stores/auth";
import { Reveal } from "./reveal";

export const FinalCtaSection: FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  return (
    <section className="border-t border-border bg-accent-soft/40 px-6 py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="landing-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Stop babysitting scrapers.
        </h2>
        <p className="mt-4 text-base text-muted sm:text-lg">
          Give Scrapio a URL and let the agent handle the maintenance.
        </p>
        <div className="mt-8 flex justify-center">
          {isLoggedIn ? (
            <Button
              variant="primary"
              size="lg"
              onPress={() => navigate(Routes.dashboard.root)}
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button variant="primary" size="lg" onPress={() => navigate(Routes.auth.sign_up)}>
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Reveal>
    </section>
  );
};
