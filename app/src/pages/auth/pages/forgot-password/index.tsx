import type { FC } from "react";
import { Card } from "@heroui/react";
import { Link } from "react-router-dom";
import { Routes } from "@/routes/routes";
import { ForgotPasswordForm } from "./components/forgot-password-form";

const ForgotPassword: FC = () => {
  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="flex flex-col gap-1 text-left mb-6">
        <p className="text-2xl font-semibold">Forgot password</p>
        <p className="text-sm text-muted">
          Enter your email and we&apos;ll send you a link to reset your password
        </p>
      </div>

      <ForgotPasswordForm />

      <div className="text-center text-sm mt-4 text-muted">
        Remember your password?{" "}
        <Link to={Routes.auth.sign_in} className="underline underline-offset-4 hover:opacity-80">
          Sign in
        </Link>
      </div>
    </Card>
  );
};

export default ForgotPassword;
