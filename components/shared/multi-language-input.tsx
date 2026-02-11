"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { locales, localeNames, type Locale } from "@/lib/constants";

const localeFlags: Record<Locale, string> = {
  en: "🇬🇧",
  he: "🇮🇱",
  "zh-CN": "🇨🇳",
  ms: "🇲🇾",
};

type MultiLanguageInputProps = {
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  currentLocale?: string;
  label?: string;
  multiline?: boolean;
  required?: boolean;
};

export function MultiLanguageInput({
  value,
  onChange,
  currentLocale = "en",
  label,
  multiline = false,
  required = false,
}: MultiLanguageInputProps) {
  const [expanded, setExpanded] = useState(false);

  const displayLocales = expanded
    ? locales
    : [currentLocale as Locale];

  const InputComponent = multiline ? Textarea : Input;

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="space-y-2">
        {displayLocales.map((locale) => (
          <div key={locale} className="flex items-center gap-2">
            <span className="text-sm w-16 shrink-0" title={localeNames[locale as Locale]}>
              {localeFlags[locale as Locale]} {locale.toUpperCase()}
            </span>
            <InputComponent
              value={value[locale] || ""}
              onChange={(e) =>
                onChange({ ...value, [locale]: e.target.value })
              }
              placeholder={`${localeNames[locale as Locale]}`}
              required={required && locale === currentLocale}
              dir={locale === "he" ? "rtl" : "ltr"}
            />
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <ChevronUp className="me-1 h-3 w-3" />
            Show current language only
          </>
        ) : (
          <>
            <ChevronDown className="me-1 h-3 w-3" />
            Show all languages ({locales.length})
          </>
        )}
      </Button>
    </div>
  );
}
