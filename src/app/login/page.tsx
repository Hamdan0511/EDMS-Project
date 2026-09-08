import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { ShanfariLogo } from "@/components/ui/shanfari-logo";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <ShanfariLogo variant="stacked" size={22} />
        </div>
        <div className="rounded-[3px] border border-border bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-text-primary">Sign in</h1>
          <p className="mb-6 text-xs text-text-secondary">
            Electronic Document Management System
          </p>
          <LoginForm />
        </div>
        <p className="mt-4 text-center text-xs text-text-muted">
          Authorized users only. Access is logged.
        </p>
      </div>
    </div>
  );
}
