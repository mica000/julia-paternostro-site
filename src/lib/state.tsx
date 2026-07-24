"use client";

/*
  Global client-side state
  ------------------------
  Two providers share state across every route so the top nav and bottom
  chrome (which live in the root layout) can read from and write to the same
  canvas config that the Work page renders from.

    ConfigProvider   → holds the CanvasConfig (grid vs list, sliders, colors, etc.)
    LanguageProvider → PT / EN toggle + a tiny useT() dictionary lookup

  Both are lightweight useState wrappers — no Zustand or Redux — because the
  state graph is small and updates are infrequent (a user clicking a toggle,
  not a per-frame animation).
*/

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { defaultConfig, type SiteConfig } from "./config";

// -----------------------------------------------------------------------------
// Site config
// -----------------------------------------------------------------------------

type ConfigCtx = {
  config: SiteConfig;
  setConfig: (next: SiteConfig) => void;
};

const ConfigContext = createContext<ConfigCtx | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const value = useMemo(() => ({ config, setConfig }), [config]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigCtx {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used inside <ConfigProvider>");
  return ctx;
}

// -----------------------------------------------------------------------------
// Language
// -----------------------------------------------------------------------------

export type Lang = "en" | "pt";

/*
  Dictionaries — keep every English key and its Portuguese counterpart side by
  side so a missing translation is a compile-time TS error. Add new keys here
  and every consumer of useT() automatically type-checks.
*/
const dicts = {
  en: {
    // Stored mixed-case — the nav renders them as-is (Figma spec).
    "nav.about": "About",
    "nav.copyEmail": "Copy email",
    "nav.copied": "Copied",
    "parallax.showAll": "Show all",
    "parallax.close": "Close",
    "parallax.goToProject": "Go to project",
    "about.title": "About",
    "about.body":
      "Torto Studio is an independent design practice working across branding, editorial, packaging, and type design.",
    "services.title": "Services",
    "services.body":
      "Brand identity, editorial design, packaging, type design, and web design.",
  },
  pt: {
    "nav.about": "Sobre",
    "nav.copyEmail": "Copiar email",
    "nav.copied": "Copiado",
    "parallax.showAll": "Ver todos",
    "parallax.close": "Fechar",
    "parallax.goToProject": "Ir para o projeto",
    "about.title": "Sobre",
    "about.body":
      "O Torto Studio é um estúdio de design independente que trabalha em branding, editorial, packaging e desenho de tipos.",
    "services.title": "Serviços",
    "services.body":
      "Identidade de marca, design editorial, packaging, desenho de tipos e web design.",
  },
} as const;

export type TranslationKey = keyof (typeof dicts)["en"];

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
};

const LangContext = createContext<LangCtx | null>(null);

const STORAGE_KEY = "torto-lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage after mount so the SSR HTML stays deterministic.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "pt" || saved === "en") setLangState(saved);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dicts[lang][key],
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside <LanguageProvider>");
  return ctx;
}

// -----------------------------------------------------------------------------
// Page background
// -----------------------------------------------------------------------------
/*
  A per-page "current background color" that fixed overlay chrome (NavFade
  scrim) can read from, so a colored case study doesn't leave a dark
  gradient strip mismatched over its own bg. Default is null → NavFade
  falls back to the canvas background (config.background).

  Pages that want to override it (case studies) call setPageBg on mount
  and setPageBg(null) on unmount — the cleanup is important so navigating
  back to the Work grid restores the canvas-driven color.
*/

type PageBgCtx = {
  pageBg: string | null;
  /** Explicit foreground color override for this route. When set, the top
      and bottom nav drop `mix-blend-mode: difference` and paint labels in
      this color. Use for saturated case study bgs where the auto blend
      lands on a low-contrast complement. */
  pageFg: string | null;
  setPageBg: (v: string | null) => void;
  setPageFg: (v: string | null) => void;
};

const PageBgContext = createContext<PageBgCtx | null>(null);

export function PageBackgroundProvider({ children }: { children: ReactNode }) {
  const [pageBg, setPageBg] = useState<string | null>(null);
  const [pageFg, setPageFg] = useState<string | null>(null);
  const value = useMemo(
    () => ({ pageBg, pageFg, setPageBg, setPageFg }),
    [pageBg, pageFg]
  );
  return <PageBgContext.Provider value={value}>{children}</PageBgContext.Provider>;
}

export function usePageBg(): PageBgCtx {
  const ctx = useContext(PageBgContext);
  if (!ctx) throw new Error("usePageBg must be used inside <PageBackgroundProvider>");
  return ctx;
}
