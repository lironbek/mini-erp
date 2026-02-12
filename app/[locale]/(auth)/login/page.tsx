"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError(t("invalidCredentials"));
      setIsLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[oklch(0.50_0.23_265)] via-[oklch(0.38_0.22_280)] to-[oklch(0.28_0.18_265)]">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 start-1/4 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute bottom-1/4 end-1/4 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute top-1/2 start-1/2 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full items-center">
          <div />

          <div className="flex flex-col items-center space-y-8">
            <Image
              src="/logo-pita.jpeg"
              alt="Pita Bakery"
              width={260}
              height={260}
              className="rounded-full shadow-2xl shadow-black/30 ring-4 ring-white/20"
              priority
            />
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold leading-tight">
                Pita Bakery
              </h1>
              <p className="text-lg text-white/70 leading-relaxed">
                Management System
              </p>
            </div>
            <div className="flex gap-6 text-sm text-white/50">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-white/80">24/7</span>
                <span>Production</span>
              </div>
              <div className="w-px bg-white/20" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-white/80">100%</span>
                <span>Quality</span>
              </div>
              <div className="w-px bg-white/20" />
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-bold text-white/80">Real-time</span>
                <span>Tracking</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/30">
            &copy; 2026 Esemby Concept. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - login form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-background p-6 sm:p-12 relative overflow-hidden">
        {/* Background image with high transparency */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/login-bg.jpeg"
            alt=""
            fill
            className="object-cover opacity-[0.07]"
            priority
          />
        </div>

        <div className="absolute top-6 end-6 z-10">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm space-y-8 relative z-10">
          {/* Logo for mobile */}
          <div className="text-center lg:hidden">
            <Image
              src="/logo-pita.jpeg"
              alt="Pita Bakery"
              width={100}
              height={100}
              className="mx-auto mb-4 rounded-full shadow-lg ring-2 ring-border"
              priority
            />
            <h1 className="text-2xl font-bold">Pita Bakery</h1>
            <p className="text-sm text-muted-foreground mt-1">Management System</p>
          </div>

          {/* Header */}
          <div className="space-y-2 hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight">{t("login")}</h2>
            <p className="text-muted-foreground text-sm">
              {t("email")} &amp; {t("password")}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                {t("email")}
              </Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="ps-10 h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                {t("password")}
              </Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="ps-10 pe-10 h-11 bg-muted/30 border-border/60 focus:bg-background transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              {t("signIn")}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground/60 lg:hidden">
            &copy; 2026 Esemby Concept
          </p>
        </div>
      </div>
    </div>
  );
}
