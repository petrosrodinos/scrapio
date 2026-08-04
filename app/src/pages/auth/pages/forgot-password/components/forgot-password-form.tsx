import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils";
import { Form, Label, Input, FieldError } from "@heroui/react";
import { ActionButtonWithPending } from "@/components/ui/action-button-with-pending";
import { ForgotPasswordSchema, type ForgotPasswordFormValues } from "../../../validation-schemas/auth";
import { useForgotPassword } from "@/features/auth/hooks/use-auth";

interface ForgotPasswordFormProps {
  className?: string;
}

export function ForgotPasswordForm({ className }: ForgotPasswordFormProps) {
  const { mutate, isPending } = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(data: ForgotPasswordFormValues) {
    mutate(data.email);
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)} className={cn("grid gap-4 text-left", className)}>
      <div className="flex flex-col gap-1">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          {...register("email")}
          placeholder="name@example.com"
          type="email"
          fullWidth
        />
        {errors.email && <FieldError>{errors.email.message}</FieldError>}
      </div>

      <ActionButtonWithPending
        type="submit"
        isDisabled={isPending}
        isPending={isPending}
        fullWidth
        className="mt-2"
      >
        Send reset link
      </ActionButtonWithPending>
    </Form>
  );
}
