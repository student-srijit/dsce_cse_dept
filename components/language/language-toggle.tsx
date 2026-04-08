"use client";

import { Languages } from "lucide-react";
import { useLanguage, type SupportedLanguage } from "@/components/language/language-provider";
import { cn } from "@/lib/utils";

const languageOptions: Array<{
  code: SupportedLanguage;
  icon: string;
  nativeLabel: string;
  englishLabel: string;
}> = [
  { code: "en", icon: "GB", nativeLabel: "English", englishLabel: "English" },
  { code: "hi", icon: "HI", nativeLabel: "हिंदी", englishLabel: "Hindi" },
  { code: "ta", icon: "TA", nativeLabel: "தமிழ்", englishLabel: "Tamil" },
  { code: "te", icon: "TE", nativeLabel: "తెలుగు", englishLabel: "Telugu" },
  { code: "kn", icon: "KN", nativeLabel: "ಕನ್ನಡ", englishLabel: "Kannada" },
];

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed right-3 top-3 z-50 rounded-2xl border border-zinc-200/80 bg-white/85 p-2 shadow-lg backdrop-blur md:right-6 md:top-6">
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
        <Languages className="h-3.5 w-3.5" />
        Language
      </div>
      <div className="grid grid-cols-5 gap-1">
        {languageOptions.map((option) => {
          const isActive = option.code === language;
          return (
            <button
              key={option.code}
              type="button"
              onClick={() => setLanguage(option.code)}
              className={cn(
                "group inline-flex min-w-0 flex-col items-center justify-center rounded-lg border px-2 py-1.5 text-[10px] font-medium transition",
                isActive
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-400 hover:text-emerald-700",
              )}
              title={`${option.englishLabel} (${option.nativeLabel})`}
              aria-label={`Switch language to ${option.englishLabel}`}
            >
              <span className="rounded-full border border-current/20 px-1.5 py-0.5 text-[9px] leading-none">
                {option.icon}
              </span>
              <span className="mt-1 truncate text-[9px] leading-none">
                {option.nativeLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
