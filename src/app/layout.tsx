import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConfigProvider, LanguageProvider, PageBackgroundProvider } from "@/lib/state";
import TopNav from "@/components/TopNav";
import NavFade from "@/components/NavFade";
import CustomCursor from "@/components/CustomCursor";
import { TransitionProvider } from "@/components/PageTransition";
import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";

/*
  Root layout
  -----------
  - Primary typeface is San Francisco, supplied by the OS (see globals.css).
    Only the monospace face is loaded from Google Fonts.
  - ConfigProvider + LanguageProvider wrap every route so the fixed TopNav
    and BottomChrome — which live here, not on individual pages — can read
    from and write to the same state as the Work canvas.
*/

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://julia-paternostro.com"),
  title: "Julia Paternostro",
  description:
    "Julia Paternostro — independent design practice: branding, editorial, packaging, type design.",
  alternates: {
    canonical: "https://julia-paternostro.com",
  },
  openGraph: {
    title: "Julia Paternostro",
    description:
      "Julia Paternostro — independent design practice: branding, editorial, packaging, type design.",
    url: "https://julia-paternostro.com",
    siteName: "Julia Paternostro",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* First-load overlay — sits above everything, needs no context, so
            it mounts ahead of the providers to paint as early as possible. */}
        <Preloader />
        <ConfigProvider>
          <LanguageProvider>
            <PageBackgroundProvider>
              <TransitionProvider>
                <SmoothScroll>
                  {/* TopNav first so keyboard focus starts in the nav, then
                      moves into the page. It's fixed with its own z-index,
                      so rendering it before the page doesn't change what
                      paints on top. */}
                  <TopNav />
                  {children}
                  <NavFade />
                  {/* Global — ring appears over any element opted-in via
                      `.tile-hover` or `data-cursor-ring`. */}
                  <CustomCursor />
                </SmoothScroll>
              </TransitionProvider>
            </PageBackgroundProvider>
          </LanguageProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
