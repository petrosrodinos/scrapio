import Navbar from "@/components/layout/navbar";
import { AppLogo } from "@/components/ui/app-logo";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <Navbar />
      <main className="flex min-h-0 flex-1 justify-center overflow-y-auto p-4 pt-10 sm:pt-16">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-center">
            <AppLogo showWordmark markClassName="h-9 w-9" wordmarkClassName="text-xl" />
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
