/*
  Studio projects — single source of truth
  ----------------------------------------
  Every project the studio has done lives here as a record. The Work page
  reads title/category off this array (via `productMeta` derived in
  config.ts) to label the tile grid; the case study page at /work/[slug]
  reads the full record — brief, context, year, and gallery.

  Localization:
    Copy that has translation-worthy content (brief, context, category)
    is stored as a `Localized` object with `en` (required) and `pt`
    (optional). Use `pick()` to resolve the current language with an
    English fallback. Names, slugs, and years stay universal.
*/

import type { Lang } from "./state";

export type Localized = { en: string; pt?: string };

/**
 * People and studios credited on a project. All fields optional — the
 * case study only renders the credits row when at least one field is set,
 * so projects without credit info yet don't show an empty block.
 * When set, missing individual fields render as an em-dash placeholder.
 */
export type Credits = {
  creativeDirection?: string;
  illustrations?: string;
  copywriting?: string;
  client?: string;
};

export type Project = {
  slug: string;
  title: string;
  category: Localized;
  year: string;
  brief: Localized;
  context: Localized;
  /** Square thumbnail used on the Work tile grid. */
  tileImage: string;
  /**
   * Optional dedicated image for the Index 2 (IndexList) split-screen view,
   * exported at the index slot's landscape proportion (~913:560) so it fills
   * the frame cleanly. When unset, IndexList falls back to `tileImage`
   * (square, letterboxed via object-contain). Lets a few hero projects show
   * a proper landscape crop in the index without affecting any other view.
   */
  indexImage?: string;
  /**
   * Case-study gallery images, in render order. The template renders
   * exactly 9 slots (hero, 2×2, 3-col, bottom hero); extra images are
   * ignored and shorter arrays wrap around.
   */
  gallery: string[];
  /** Optional credits row shown at the bottom of the case study. */
  credits?: Credits;
  /** Case-study background color (hex). Also seeds the click-through
      transition on the Work grid — the tile's bg fills the viewport and
      lands on this exact color. Falls back to the shared `defaultBg`. */
  bg?: string;
  /** Text color override. When set, both content AND the top/bottom nav
      switch to this explicit color (the nav drops its usual
      `mix-blend-mode: difference` for this route). When unset, fg is
      auto-derived via `invertHex(bg)` — same value the difference blend
      would produce.

      Use this for saturated warm bgs where the auto-invert lands on a
      complementary hue with poor contrast (e.g. coral → teal). */
  fg?: string;
  /**
   * Masonry mode — tile aspect ratio (height ÷ width).
   * 1.0 = square, > 1.0 = taller, < 1.0 = wider.
   *
   * Only affects the MASONRY view — GRID / LIST / ORBIT are untouched.
   * Optional: when unset, MasonryGrid applies a rotating default so the
   * layout still reads as masonry out of the box.
   *
   * Because the current tile sources are square PNGs, non-1.0 values are
   * displayed via `object-cover`, which crops the source. Set this to
   * `1.0` on any project where cropping loses artwork.
   */
  tileAspect?: number;
  /**
   * Case-study layout as a flat list of sections, matching the Figma
   * design where each section is a row: 1 full-width image, or an
   * N-column strip of images. When set, the CaseStudy template renders
   * `sections` instead of the fixed 9-slot `gallery` — so different
   * projects can have wildly different densities without touching the
   * template.
   *
   * `gallery` stays as the fallback: projects without `sections` keep
   * rendering with the original 9-slot template (hero / 2×2 / 3-col /
   * bottom hero) and don't need to migrate all at once.
   */
  sections?: Section[];
};

/**
 * A single row in the case-study layout.
 *   - `hero`: one full-width image. Optional `ratio` (CSS aspect-ratio
 *     string, e.g. "913 / 560") — defaults to the Figma standard
 *     landscape ratio.
 *   - `cols`: an N-column strip. `images.length` must equal `cols`.
 *     `ratio` describes one tile's aspect (w / h) — defaults are the
 *     Figma tile aspects for 2-col and 3-col rows.
 */
export type Section =
  | { kind: "hero"; src: string; ratio?: string }
  | { kind: "cols"; cols: 2 | 3; images: string[]; ratio?: string };

/** Fallback bg when a project hasn't picked its own. */
export const defaultBg = "#0a0a0a";

/**
 * Mix a hex color toward black by `amount` (0..1). At 0 the color is
 * unchanged; at 1 it's pure black. Used site-wide so case study
 * backgrounds keep a hint of the project's hue while staying dark
 * enough for white body text to read at WCAG AA.
 */
export function darkenHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const k = 1 - Math.max(0, Math.min(1, amount));
  const r = Math.round(parseInt(h.slice(0, 2), 16) * k);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * k);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * k);
  return (
    "#" +
    [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Site-wide "dark variant" of a project's bg. All the loud saturated hues
 * (coral, magenta, cream…) collapse to a near-black tint of the same hue,
 * so the whole site reads as dark with white text and each project still
 * has a subtle signature color.
 */
const DARK_MIX = 0.82;
export function projectBg(project: Pick<Project, "bg">): string {
  return darkenHex(project.bg ?? defaultBg, DARK_MIX);
}

/**
 * Compute the "difference-blend of white" color for a given background —
 * mathematically identical to `mix-blend-mode: difference` on white text
 * over the same bg, since |255 − bg| = 255 − bg when text is white.
 *
 * That's exactly the color the top nav renders via mix-blend-mode, so using
 * this for the case study body text keeps nav + content in one visual tone
 * on every colored page (navy on yellow, beige on deep blue, teal on coral,
 * etc.) without applying mix-blend-mode to the case study text itself —
 * which would misbehave when text scrolls over gallery images.
 */
export function invertHex(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const r = 255 - parseInt(h.slice(0, 2), 16);
  const g = 255 - parseInt(h.slice(2, 4), 16);
  const b = 255 - parseInt(h.slice(4, 6), 16);
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Resolves a Localized value against the active language. Falls back to
 * English whenever a PT translation is missing so pages never render blanks.
 */
export function pick(v: Localized, lang: Lang): string {
  return (lang === "pt" && v.pt) || v.en;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Fallback gallery built from the 11 tile PNGs. `offset` shifts the start
 * index so each project gets a distinct-looking case study without needing
 * bespoke assets. Real project imagery will replace these later.
 */
function fallbackGallery(offset: number): string[] {
  return Array.from({ length: 9 }, (_, i) => {
    const n = ((offset + i) % 11) + 1;
    return `/Images/${String(n).padStart(2, "0")}-square.png`;
  });
}

const tile = (n: number) => `/Images/${String(n).padStart(2, "0")}-square.png`;

/**
 * Case-study asset path helper. Turns a bare filename ("Rectangle 1") into
 * a URL-encoded path under `/Images/<Folder>/`. Handles spaces in the
 * source filenames (Figma exports use them by default) by encoding to %20
 * — matching the existing pattern used for `Images/without%20bg/`.
 */
const asset = (folder: string, name: string, ext = "webp") =>
  `/Images/${folder}/${name.replace(/ /g, "%20")}.${ext}`;

// -----------------------------------------------------------------------------
// Projects
// -----------------------------------------------------------------------------

/*
  Order = tile grid order on the Work page. Reorder here to reorder there.
  Slug = URL segment. Kebab-case, ASCII only, no diacritics — they'd cause
  encoding surprises when linked externally.
*/
/*
  Twelve real projects from Julia Paternostro's portfolio (see
  juliapaternostro.framer.website). Content on eight of them was scraped
  from the Framer site; the four without Framer pages
  (Vivs, Budapest Forró, Prêmio Inoves, Leather, and the São João /
  Samba pages with only metadata) carry short placeholder briefs to be
  filled in later.

  Tile order = the order on the studio's own portfolio grid. Slugs are
  ASCII kebab-case (no diacritics) so they URL-encode cleanly.
*/
export const projects: Project[] = [
  // ---------------------------------------------------------------------------
  // 1. Delírio Tropical
  // ---------------------------------------------------------------------------
  {
    slug: "delirio-tropical",
    title: "Delírio Tropical",
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    brief: {
      en: "The festival's visual identity channels this spirit into a bold and immersive experience. Wild, surreal, and electrifying, it blends vibrant colors, halftone textures, and striking graphic compositions. The result is a retro-futuristic aesthetic infused with adventure and dreamlike intensity — where music and visuals collide in hypnotic harmony.",
      pt: "A identidade visual do festival canaliza esse espírito para uma experiência ousada e imersiva. Selvagem, surreal e eletrizante, mistura cores vibrantes, texturas em retícula e composições gráficas marcantes. O resultado é uma estética retro-futurista impregnada de aventura e intensidade onírica — onde música e visuais colidem em harmonia hipnótica.",
    },
    context: {
      en: "Delírio Tropical is a music festival in Espírito Santo, Brazil, created to honor and amplify the region's rich cultural scene. Its first edition, held in January 2024, brought together 76 artists across diverse genres, celebrating the state's musical identity.",
      pt: "Delírio Tropical é um festival de música em Espírito Santo, Brasil, criado para honrar e amplificar a rica cena cultural da região. A primeira edição, realizada em janeiro de 2024, reuniu 76 artistas de gêneros diversos, celebrando a identidade musical do estado.",
    },
    tileImage: tile(1),
    indexImage: "/Images/Index2/delirio-tropical.webp",
    gallery: fallbackGallery(0),
    credits: {
      creativeDirection: "Julia Paternostro",
      illustrations: "Julia Paternostro",
      copywriting: "Yasmin Nariyoshi",
      client: "Puri Produções",
    },
    bg: "#ff4e2b",
    // Auto-invert of coral is teal (0, 177, 212) — a complement, so contrast
    // is poor. Explicit deep warm near-black lands ~6:1 against coral,
    // harmonizes with the tropical palette, and passes WCAG AA at body size.
    fg: "#1a0500",
    // Case-study layout uses the re-exported Delírio images in
    // public/Images/Delirio-Tropical/ (01–15, 19–32; 29 total). Files are
    // named in reading order and grouped by their native aspect ratio:
    //   - 01, 02, 03, 10, 11, 12, 23  → hero (1.63:1 landscape)
    //   - 19, 20, 21, 22               → cols=2 (0.80:1 portrait)
    //   - 04–06, 13–15, 24–32          → cols=3 (0.72:1 portrait)
    //   - 07, 08, 09                   → cols=3 (1:1 square icon row)
    sections: [
      { kind: "hero", src: asset("Delirio-Tropical", "01") },
      { kind: "hero", src: asset("Delirio-Tropical", "02") },
      { kind: "hero", src: asset("Delirio-Tropical", "03") },
      {
        kind: "cols",
        cols: 3,
        images: [
          asset("Delirio-Tropical", "04"),
          asset("Delirio-Tropical", "05"),
          asset("Delirio-Tropical", "06"),
        ],
      },
      {
        // Square icon row — 3 × 1:1 tiles. Overrides the cols=3 default
        // (0.72:1 portrait) so the icons don't get stretched vertically.
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Delirio-Tropical", "07"),
          asset("Delirio-Tropical", "08"),
          asset("Delirio-Tropical", "09"),
        ],
      },
      { kind: "hero", src: asset("Delirio-Tropical", "10") },
      { kind: "hero", src: asset("Delirio-Tropical", "11") },
      { kind: "hero", src: asset("Delirio-Tropical", "12") },
      {
        kind: "cols",
        cols: 3,
        images: [
          asset("Delirio-Tropical", "13"),
          asset("Delirio-Tropical", "14"),
          asset("Delirio-Tropical", "15"),
        ],
      },
      {
        kind: "cols",
        cols: 2,
        images: [
          asset("Delirio-Tropical", "19"),
          asset("Delirio-Tropical", "20"),
        ],
      },
      {
        kind: "cols",
        cols: 2,
        images: [
          asset("Delirio-Tropical", "21"),
          asset("Delirio-Tropical", "22"),
        ],
      },
      { kind: "hero", src: asset("Delirio-Tropical", "23") },
      {
        kind: "cols",
        cols: 3,
        images: [
          asset("Delirio-Tropical", "24"),
          asset("Delirio-Tropical", "25"),
          asset("Delirio-Tropical", "26"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        images: [
          asset("Delirio-Tropical", "27"),
          asset("Delirio-Tropical", "28"),
          asset("Delirio-Tropical", "29"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        images: [
          asset("Delirio-Tropical", "30"),
          asset("Delirio-Tropical", "31"),
          asset("Delirio-Tropical", "32"),
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // 2. Vivs — no Framer page yet; placeholder copy.
  // ---------------------------------------------------------------------------
  {
    slug: "vivs",
    title: "Vivs",
    category: { en: "Illustration", pt: "Ilustração" },
    year: "2024",
    brief: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    context: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    tileImage: tile(2),
    gallery: fallbackGallery(1),
    bg: "#2d7c3b",
  },
  // ---------------------------------------------------------------------------
  // 3. Budapest Forró Festival — no Framer page yet; placeholder copy.
  // ---------------------------------------------------------------------------
  {
    slug: "budapest-forro",
    title: "Budapest Forró Festival",
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    brief: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    context: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    tileImage: tile(3),
    gallery: fallbackGallery(2),
    bg: "#c81f3f",
    // Auto-invert of this saturated red lands on low-contrast teal; use a
    // deep warm near-black for legibility (same trick as Delírio).
    fg: "#1a0500",
  },
  // ---------------------------------------------------------------------------
  // 4. Delírio Tropical — São João (Framer page had only metadata)
  // ---------------------------------------------------------------------------
  {
    slug: "delirio-sao-joao",
    title: "Delírio Tropical — São João",
    category: { en: "Branding", pt: "Branding" },
    year: "2025",
    brief: {
      en: "São João edition of Delírio Tropical, translating the festival's identity into the language of Brazil's June celebrations — bonfires, quadrilhas, and forró — while keeping the wild, surreal spirit of the original.",
      pt: "Edição São João do Delírio Tropical, que traduz a identidade do festival para a linguagem das festas juninas — fogueiras, quadrilhas e forró — mantendo o espírito selvagem e surreal do original.",
    },
    context: {
      en: "Held in February 2025 over a single month of production. Same visual DNA as the flagship Delírio Tropical, retuned for the São João season.",
      pt: "Realizada em fevereiro de 2025, com um mês de produção. Mesmo DNA visual do Delírio Tropical original, reajustado para a temporada de São João.",
    },
    tileImage: tile(4),
    indexImage: "/Images/Index2/sao-joao.webp",
    gallery: fallbackGallery(3),
    bg: "#0f2b1e",
    // Case-study layout — 30 re-exported images under
    // public/Images/Delirio-Sao-Joao/ (01–30), grouped by native aspect:
    //   - 01–03, 07–10, 19–20, 29–30 → hero landscapes (~1.71–1.83:1)
    //   - 04–06                       → 3-col square row (1:1)
    //   - 11–12, 27–28                → 2-col portraits (0.80:1, cols2 default)
    //   - 13–18, 24–26                → 3-col portraits (0.80:1, ratio override)
    //   - 21–23                       → 3-col portraits (0.72:1, cols3 default)
    // Explicit ratios prevent object-cover cropping.
    sections: [
      { kind: "hero", src: asset("Delirio-Sao-Joao", "01"), ratio: "2739 / 1542" },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "02"), ratio: "2740 / 1599" },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "03"), ratio: "2740 / 1542" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Delirio-Sao-Joao", "04"),
          asset("Delirio-Sao-Joao", "05"),
          asset("Delirio-Sao-Joao", "06"),
        ],
      },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "07"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "08"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "09"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "10"), ratio: "2740 / 1542" },
      {
        // Portrait pair — 1342×1682 (~0.80:1) matches the cols2 default.
        kind: "cols",
        cols: 2,
        images: [
          asset("Delirio-Sao-Joao", "11"),
          asset("Delirio-Sao-Joao", "12"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "877 / 1097",
        images: [
          asset("Delirio-Sao-Joao", "13"),
          asset("Delirio-Sao-Joao", "14"),
          asset("Delirio-Sao-Joao", "15"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "877 / 1095",
        images: [
          asset("Delirio-Sao-Joao", "16"),
          asset("Delirio-Sao-Joao", "17"),
          asset("Delirio-Sao-Joao", "18"),
        ],
      },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "19"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "20"), ratio: "2740 / 1542" },
      {
        // Portrait row — 877×1217 (~0.72:1) matches the cols3 default.
        kind: "cols",
        cols: 3,
        images: [
          asset("Delirio-Sao-Joao", "21"),
          asset("Delirio-Sao-Joao", "22"),
          asset("Delirio-Sao-Joao", "23"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "877 / 1095",
        images: [
          asset("Delirio-Sao-Joao", "24"),
          asset("Delirio-Sao-Joao", "25"),
          asset("Delirio-Sao-Joao", "26"),
        ],
      },
      {
        kind: "cols",
        cols: 2,
        images: [
          asset("Delirio-Sao-Joao", "27"),
          asset("Delirio-Sao-Joao", "28"),
        ],
      },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "29"), ratio: "2740 / 1500" },
      { kind: "hero", src: asset("Delirio-Sao-Joao", "30"), ratio: "2740 / 1542" },
    ],
  },
  // ---------------------------------------------------------------------------
  // 5. Prêmio Inoves — no Framer page yet; placeholder copy.
  // ---------------------------------------------------------------------------
  {
    slug: "premio-inoves",
    title: "Prêmio Inoves",
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    context: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    tileImage: tile(5),
    gallery: fallbackGallery(4),
    bg: "#4b2a7a",
  },
  // ---------------------------------------------------------------------------
  // 6. 30º Festival de Cinema de Vitória — Framer content.
  // ---------------------------------------------------------------------------
  {
    slug: "fcv",
    title: "30º Festival de Cinema de Vitória",
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "The 30th Vitória Film Festival marks a historic edition, celebrating three decades of dedication to Brazilian cinema. In tribute to this milestone, the visual identity honors and brings closer those who keep the flame of audiovisual art alive: different generations of cinema lovers.",
      pt: "O 30º Festival de Cinema de Vitória marca uma edição histórica, celebrando três décadas de dedicação ao cinema brasileiro. Em homenagem a esse marco, a identidade visual honra e aproxima quem mantém acesa a chama da arte audiovisual: diferentes gerações de amantes do cinema.",
    },
    context: {
      en: "The characters represent the transmission of legacy between generations and the encouragement of the new. The forward movement symbolizes hard work, constant evolution, and a gaze toward the future. The aesthetic blends analog and digital elements — film textures, collages, visual glitches, and intense colors come together to create a vibrant and emotional visual language.",
      pt: "Os personagens representam a transmissão do legado entre gerações e o incentivo ao novo. O movimento para frente simboliza trabalho árduo, evolução constante e um olhar voltado para o futuro. A estética mistura elementos analógicos e digitais — texturas de película, colagens, glitches visuais e cores intensas se unem para criar uma linguagem visual vibrante e emocional.",
    },
    tileImage: tile(6),
    indexImage: "/Images/Index2/30-festival.webp",
    gallery: fallbackGallery(5),
    bg: "#ffd9d9",
    // Case-study layout — 26 re-exported images under
    // public/Images/30-FCV/ (01–26), grouped by native aspect ratio:
    //   - 01–06, 16–18, 25–26 → hero (1.63:1 landscape)
    //   - 07–15, 19–21        → 3-col square rows (1:1)
    //   - 22–24               → 3-col portrait row (0.72:1, cols3 default)
    // Explicit ratios prevent object-cover cropping.
    sections: [
      { kind: "hero", src: asset("30-FCV", "01"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "02"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "03"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "04"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "05"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "06"), ratio: "2740 / 1682" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("30-FCV", "07"),
          asset("30-FCV", "08"),
          asset("30-FCV", "09"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("30-FCV", "10"),
          asset("30-FCV", "11"),
          asset("30-FCV", "12"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("30-FCV", "13"),
          asset("30-FCV", "14"),
          asset("30-FCV", "15"),
        ],
      },
      { kind: "hero", src: asset("30-FCV", "16"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "17"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "18"), ratio: "2740 / 1682" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("30-FCV", "19"),
          asset("30-FCV", "20"),
          asset("30-FCV", "21"),
        ],
      },
      {
        // Portrait row — 877×1217 (~0.72:1) matches the cols3 default.
        kind: "cols",
        cols: 3,
        images: [
          asset("30-FCV", "22"),
          asset("30-FCV", "23"),
          asset("30-FCV", "24"),
        ],
      },
      { kind: "hero", src: asset("30-FCV", "25"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "26"), ratio: "2740 / 1682" },
    ],
  },
  // ---------------------------------------------------------------------------
  // 7. Tenda Lab — Framer content.
  // ---------------------------------------------------------------------------
  {
    slug: "tenda-lab",
    title: "Tenda Lab",
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "Tenda Lab is a free festival that celebrates the diversity of Brazilian music, bringing together artists from different generations, styles, and musical backgrounds. In its 8th edition, the event embraced the theme “vem todo mundo” (“everyone’s invited”), highlighting plurality as a creative force and a powerful connector between artists and the audience.",
      pt: "O Tenda Lab é um festival gratuito que celebra a diversidade da música brasileira, reunindo artistas de diferentes gerações, estilos e vertentes musicais. Em sua 8ª edição, o evento abraçou o tema “vem todo mundo”, destacando a pluralidade como força criativa e conector entre artistas e público.",
    },
    context: {
      en: "The visual identity was built around this vibrant and collective spirit. Bright colors, modular shapes, and wave-inspired graphics create a dynamic visual universe. Diverse characters, musical elements, and expressive typography complete the festival's vibrant and inclusive atmosphere.",
      pt: "A identidade visual foi construída em torno desse espírito vibrante e coletivo. Cores vivas, formas modulares e grafismos inspirados em ondas criam um universo visual dinâmico. Personagens diversos, elementos musicais e tipografia expressiva completam a atmosfera vibrante e inclusiva do festival.",
    },
    tileImage: tile(7),
    gallery: fallbackGallery(6),
    bg: "#f0eee8",
    // Case-study layout — 32 re-exported images under
    // public/Images/Tenda-Lab/ (01–32), grouped by native aspect ratio:
    //   - 01–04, 09–11, 18–20 → hero landscapes (varying 1.63–1.88:1)
    //   - 08                   → wide banner strip (3.63:1)
    //   - 05–07, 12–17, 21–32  → 3-col square rows (1:1)
    // Explicit ratios prevent object-cover cropping.
    sections: [
      { kind: "hero", src: asset("Tenda-Lab", "01"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("Tenda-Lab", "02"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("Tenda-Lab", "03"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "04"), ratio: "2740 / 1542" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "05"),
          asset("Tenda-Lab", "06"),
          asset("Tenda-Lab", "07"),
        ],
      },
      // Wide banner — 2740×755 (~3.63:1). Full-width strip.
      { kind: "hero", src: asset("Tenda-Lab", "08"), ratio: "2740 / 755" },
      { kind: "hero", src: asset("Tenda-Lab", "09"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "10"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "11"), ratio: "2740 / 1456" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "12"),
          asset("Tenda-Lab", "13"),
          asset("Tenda-Lab", "14"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "15"),
          asset("Tenda-Lab", "16"),
          asset("Tenda-Lab", "17"),
        ],
      },
      { kind: "hero", src: asset("Tenda-Lab", "18"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "19"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "20"), ratio: "2740 / 1473" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "21"),
          asset("Tenda-Lab", "22"),
          asset("Tenda-Lab", "23"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "24"),
          asset("Tenda-Lab", "25"),
          asset("Tenda-Lab", "26"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "27"),
          asset("Tenda-Lab", "28"),
          asset("Tenda-Lab", "29"),
        ],
      },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "30"),
          asset("Tenda-Lab", "31"),
          asset("Tenda-Lab", "32"),
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------
  // 8. Samba que eu quero ver — no Framer page yet; placeholder copy.
  // ---------------------------------------------------------------------------
  {
    slug: "samba",
    title: "Samba que eu quero ver",
    category: { en: "Illustration", pt: "Ilustração" },
    year: "2024",
    brief: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    context: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    tileImage: tile(8),
    gallery: fallbackGallery(7),
    bg: "#2d7c3b",
  },
  // ---------------------------------------------------------------------------
  // 9. Leather — no Framer page yet; placeholder copy.
  // ---------------------------------------------------------------------------
  {
    slug: "leather",
    title: "Leather",
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    brief: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    context: {
      en: "Case study coming soon.",
      pt: "Case study em breve.",
    },
    tileImage: tile(9),
    gallery: fallbackGallery(8),
    bg: "#0a0a0a",
  },
  // ---------------------------------------------------------------------------
  // 10. A Selva — Framer content.
  // ---------------------------------------------------------------------------
  {
    slug: "a-selva",
    title: "A Selva",
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "Located in the heart of the city of Vitória — ES, A Selva is a multicultural venue with a program that moves between concerts, festivals and themed parties. With a focus on Brazilian culture and freedom of expression, the venue promotes meetings between established artists and new talents, always valuing diversity.",
      pt: "Localizada no coração da cidade de Vitória — ES, A Selva é uma casa multicultural com programação que transita entre shows, festivais e festas temáticas. Com foco na cultura brasileira e na liberdade de expressão, o espaço promove encontros entre artistas consagrados e novos talentos, sempre valorizando a diversidade.",
    },
    context: {
      en: "The venue's visual identity translates this essence with strength and originality. Inspired by a night in the forest, the aesthetics plunge into a universe of organic shapes and vibrant colors. The character of the jaguar — fun, fierce, and irreverent — invites the audience to throw themselves into this jungle of freedom and enjoy the night without fear of being who they are.",
      pt: "A identidade visual da casa traduz essa essência com força e originalidade. Inspirada em uma noite na floresta, a estética mergulha num universo de formas orgânicas e cores vibrantes. O personagem da onça-pintada — divertido, feroz e irreverente — convida o público a se jogar nessa selva de liberdade e curtir a noite sem medo de ser quem é.",
    },
    tileImage: tile(10),
    gallery: fallbackGallery(9),
    bg: "#ff5b7f",
    // Saturated warm pink → invertHex would land on a low-contrast pale
    // cyan. Use a deep near-black instead.
    fg: "#1a0208",
  },
  // ---------------------------------------------------------------------------
  // 11. CineMarias — Framer content.
  // ---------------------------------------------------------------------------
  {
    slug: "cinemarias",
    title: "CineMarias",
    category: { en: "Branding", pt: "Branding" },
    year: "2022",
    brief: {
      en: "The 1st CineMarias Festival took place from September 1st to 3rd, 2022, featuring short film screenings, workshops, masterclasses, an immersive audiovisual training lab, and live music performances.",
      pt: "O 1º Festival CineMarias aconteceu entre 1 e 3 de setembro de 2022, com exibição de curtas-metragens, oficinas, masterclasses, um laboratório imersivo de formação audiovisual e apresentações musicais ao vivo.",
    },
    context: {
      en: "The theme “Body is Territory” invites a reflection on the social memory of feminine identities through the experiences of their individual and collective bodies. The visual composition of CineMarias 2022 was designed to evoke a modern, artistic, and sensitive language, while carrying strong visual impact and powerful expression.",
      pt: "O tema “Corpo é Território” convida à reflexão sobre a memória social das identidades femininas através das experiências de seus corpos individuais e coletivos. A composição visual de CineMarias 2022 foi desenhada para evocar uma linguagem moderna, artística e sensível, carregando forte impacto visual e expressão poderosa.",
    },
    tileImage: tile(11),
    gallery: fallbackGallery(10),
    bg: "#d9c5a6",
  },
  // ---------------------------------------------------------------------------
  // 12. Human or Machine? — Framer content.
  //
  // TODO: needs its own tile image at /Images/12-square.png. Falls back to
  // Delírio's image (01) for now so the grid layout doesn't 404. Swap the
  // tileImage line once the real thumbnail is dropped in.
  // ---------------------------------------------------------------------------
  {
    slug: "human-or-machine",
    title: "Human or Machine?",
    category: { en: "Illustration", pt: "Ilustração" },
    year: "2025",
    brief: {
      en: "Illustration created during the course Direction and Production of Illustration, with Jun Ioneda (Aprender Design). The assignment was to create an image for promoting a BBC article on Instagram, using mixed media.",
      pt: "Ilustração criada durante o curso Direção e Produção de Ilustração, com Jun Ioneda (Aprender Design). O exercício foi criar uma imagem para promover um artigo da BBC no Instagram, usando mídias mistas.",
    },
    context: {
      en: "Based on the BBC article about the complex relationship between Japanese people and robots, I developed a composition that combines digital collage, photo manipulation, and digital painting. The hybrid figure symbolizes the fusion between human and technology, while the damaged wires in the background suggest the boundaries and tensions of this coexistence.",
      pt: "A partir de um artigo da BBC sobre a complexa relação entre japoneses e robôs, desenvolvi uma composição que combina colagem digital, manipulação de imagem e pintura digital. A figura híbrida simboliza a fusão entre humano e tecnologia, enquanto os fios danificados ao fundo sugerem os limites e tensões dessa convivência.",
    },
    tileImage: tile(1),
    gallery: fallbackGallery(0),
    bg: "#1a1a1a",
  },
];

/**
 * Look up a project by its URL slug. Returns undefined for unknown slugs
 * so the case study page can render a 404 or a graceful placeholder.
 */
export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

/**
 * The first `count` gallery images of a project, flattened from its
 * `sections` in reading order (a hero contributes its `src`; a cols row
 * contributes its `images` left-to-right). Used by the Index 2 view to
 * auto-cycle a small preview reel when an image-rich project is the active
 * selection. Projects without `sections` return an empty array — the index
 * just shows their single tile/index image instead of a reel.
 */
export function projectPreviewImages(
  project: Pick<Project, "sections">,
  count = 4
): string[] {
  if (!project.sections) return [];
  const urls: string[] = [];
  for (const s of project.sections) {
    if (s.kind === "hero") urls.push(s.src);
    else urls.push(...s.images);
    if (urls.length >= count) break;
  }
  return urls.slice(0, count);
}

/**
 * A handful of images for a project, in reading order — used by the
 * Parallax index to scatter satellite images around the hero and to fill
 * the "Show all" thumbnail strips. Prefers the real case-study `sections`
 * imagery when a project has it; otherwise falls back to the `gallery`
 * array (which every project has, even if placeholder), and finally to the
 * single tile image. Always returns at least one URL.
 */
export function projectImageSet(
  project: Pick<Project, "sections" | "gallery" | "tileImage">,
  count = 6
): string[] {
  const fromSections = project.sections
    ? projectPreviewImages(project, count)
    : [];
  const base = fromSections.length ? fromSections : project.gallery ?? [];
  const set = base.length ? base : [project.tileImage];
  return set.slice(0, count);
}
