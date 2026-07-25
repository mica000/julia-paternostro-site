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
  title: "Torto Studio",
  description:
    "Torto Studio — independent design practice: branding, editorial, packaging, type design.",
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
                  {children}
                  <NavFade />
                  <TopNav />
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
