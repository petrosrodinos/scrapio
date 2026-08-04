import type { FC } from "react";
import { Card } from "@heroui/react";
import { Link, useSearchParams } from "react-router-dom";
import { Routes } from "@/routes/routes";
import { ResetPasswordForm } from "./components/reset-password-form";

const ResetPassword: FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  return (
    <Card className="w-full max-w-md mx-auto p-8">
      <div className="flex flex-col gap-1 text-left mb-6">
        <p className="text-2xl font-semibold">Reset password</p>
        <p className="text-sm text-muted">Enter your new password below</p>
      </div>

      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-danger text-center">
          Invalid or missing reset link. Please request a new one.
        </p>
      )}

      <div className="text-center text-sm mt-4 text-muted">
        <Link to={Routes.auth.forgot_password} className="underline underline-offset-4 hover:opacity-80">
          Request a new reset link
        </Link>
      </div>
    </Card>
  );
};

export default ResetPassword;
