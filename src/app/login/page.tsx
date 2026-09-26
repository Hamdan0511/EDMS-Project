import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./login-form";
import { MarketingLogo } from "@/components/marketing/marketing-logo";
import { SHANFARI_ASSETS } from "@/data/shanfariAssets";
import { COMPANY_INFO } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to the Shanfari Furnishing connected workspace.",
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/home");
  }

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="flex flex-col justify-between px-6 py-10 sm:px-12 sm:py-14 lg:px-20">
        <Link href="/" aria-label="Back to Shanfari Furnishing">
          <MarketingLogo height={28} />
        </Link>

        <div className="mx-auto w-full max-w-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-brand-600">Connected Workspace</p>
          <h1 className="mt-4 font-serif text-[34px] leading-tight text-brand-950">Welcome back.</h1>
          <p className="mt-2 text-[14px] text-text-secondary">Sign in to your workspace.</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-[13px] text-text-muted">
            Forgot your password?{" "}
            <a href={`mailto:${COMPANY_INFO.email}`} className="text-brand-800 hover:underline">
              Contact your administrator
            </a>
            .
          </p>
        </div>

        <p className="text-[12px] text-text-muted">Authorized users only. Access is logged.</p>
      </div>

      <div className="relative hidden lg:block">
        <Image
          src={SHANFARI_ASSETS.heroLobby.src}
          alt={SHANFARI_ASSETS.heroLobby.alt}
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/60 via-brand-950/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Royal Opera House Muscat</p>
          <p className="mt-2 max-w-sm font-serif text-[22px] leading-snug">
            Connected Operations. Built for Shanfari.
          </p>
        </div>
      </div>
    </div>
  );
}
