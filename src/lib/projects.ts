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
 * A single credit: who did what. `role` is localized (EN/PT); `people` is one
 * string, using "&" for multi-name lists so it reads in either language.
 */
export type CreditItem = { role: Localized; people: string };

/**
 * People and studios credited on a project.
 *
 * `items` is the ordered role → people list (Julia's shared Notion credits),
 * each rendered as one value-over-label field in the case-study credits row.
 * `client` stays a single string (a proper noun, same in both languages).
 * Both optional — the row only shows what's set, and falls back to the
 * project's deliverables when there are no detailed credits.
 */
export type Credits = {
  items?: CreditItem[];
  client?: string;
};

export type Project = {
  slug: string;
  title: string;
  category: Localized;
  year: string;
  brief: Localized;
  /** One-line summary shown in the parallax footer (Figma node 197:582).
      Short enough to sit in a 160px column. When absent, the footer falls
      back to a clipped opening of `brief`. */
  tagline?: Localized;
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
  /** Deliverables list for the case-study meta row (Figma node 403:1062),
      e.g. "Branding, Illustrations, Creative direction". When absent the meta
      row falls back to the project's `category`. */
  deliverables?: Localized;
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
  /**
   * Hidden from the listing surfaces (parallax index stage + timeline, the
   * Show-all list, and case-study "related" footer) without being deleted.
   * The data and assets stay in place and the /work/[slug] page still resolves
   * by direct link, so a hidden project can be brought back by flipping this
   * flag. Used to trim the site to the finished projects for a delivery.
   */
  hidden?: boolean;
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
    return `/Images/loading/${String(n).padStart(2, "0")}-square.webp`;
  });
}

const tile = (n: number) => `/Images/loading/${String(n).padStart(2, "0")}-square.webp`;

/**
 * All-projects sheet imagery (Figma node 459:6397). Four landscape crops per
 * project, in LEFT→RIGHT display order. The export files number each row
 * BACKWARDS (…-04 is the leftmost image, …-01 the rightmost), so these lists
 * run 04→01. Keyed by slug; `ShowAllList` falls back to the project's own
 * gallery for any slug not listed here.
 */
export type SheetImage = { src: string; ratio: number };
// `ratio` is the image's real w/h — the sheet lays each row out "justified"
// (widths ∝ ratio, one shared height), so nothing is cropped. Exported files
// are all 590px tall, so ratio = width / 590.
const sheet = (name: string, ratio: number): SheetImage => ({
  src: `/Images/all-projects/${name}.webp`,
  ratio,
});
export const LIST_IMAGES: Record<string, SheetImage[]> = {
  "delirio-tropical": [sheet("delirio-04", 1.553), sheet("delirio-03", 1.553), sheet("delirio-02", 1.553), sheet("delirio-01", 1.553)],
  fcv: [sheet("30-fcv-04", 1.553), sheet("30-fcv-03", 1.553), sheet("30-fcv-02", 1.553), sheet("30-fcv-01", 1.553)],
  "delirio-sao-joao": [sheet("sao-joao-04", 1.553), sheet("sao-joao-03", 1.559), sheet("sao-joao-02", 1.553), sheet("sao-joao-01", 1.553)],
  "tenda-lab": [sheet("tenda-04", 1.553), sheet("tenda-03", 1.553), sheet("tenda-02", 1.553), sheet("tenda-01", 1.553)],
  vivs: [sheet("vivs-04", 1.58), sheet("vivs-03", 1.58), sheet("vivs-02", 1.58), sheet("vivs-01", 1.58)],
  "a-selva": [sheet("selva-04", 1.58), sheet("selva-03", 1.58), sheet("selva-02", 1.58), sheet("selva-01", 1.58)],
  "budapest-forro": [sheet("buda-04", 1.58), sheet("buda-03", 1.58), sheet("buda-02", 1.58), sheet("buda-01", 1.58)],
  // Figma node 459:6460 — 4 crops at 465.4×294.6 (ratio 1.580).
  xoxa: [sheet("xuxa-04", 1.58), sheet("xuxa-03", 1.58), sheet("xuxa-02", 1.58), sheet("xuxa-01", 1.58)],
};

/**
 * Case-study asset path helper. Turns a bare filename ("Rectangle 1") into
 * a URL-encoded path under `/Images/<Folder>/`. Handles spaces in the
 * source filenames (Figma exports use them by default) by encoding to %20
 * — matching the existing pattern used for `Images/without%20bg/`.
 */
const asset = (folder: string, name: string, ext = "webp") =>
  `/Images/${folder}/${name.replace(/ /g, "%20")}.${ext}`;

/**
 * Credit role labels (EN/PT), shared across projects so the same role reads
 * identically everywhere. Mirrors the "Credits (PT/EN)" columns of the shared
 * Notion database; people are attached per-project.
 */
const ROLE = {
  creativeLead: {
    en: "Creative Direction, Visual Identity & Illustration",
    pt: "Direção Criativa, Identidade Visual e Ilustração",
  },
  artLead: {
    en: "Art Direction, Visual Identity & Illustration",
    pt: "Direção de Arte, Identidade Visual e Ilustração",
  },
  copyConcept: { en: "Copywriting & Concept", pt: "Redação e Defesa" },
  conceptRationale: { en: "Concept Rationale", pt: "Defesa Conceitual" },
  creativeConcept: { en: "Creative Concept", pt: "Conceito Criativo" },
  copywriting: { en: "Copywriting", pt: "Redação" },
  applicationDesign: { en: "Application Design", pt: "Design de Aplicação" },
  muralExecution: { en: "Mural Execution", pt: "Execução da Pintura" },
  setDesign: { en: "Set Design", pt: "Cenografia" },
  photography: { en: "Photography", pt: "Fotos" },
  eventPhotography: { en: "Event Photography", pt: "Fotos do Evento" },
} satisfies Record<string, Localized>;

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
const projectsSource: Project[] = [
  // ---------------------------------------------------------------------------
  // 1. Delírio Tropical
  // ---------------------------------------------------------------------------
  {
    slug: "delirio-tropical",
    title: "Delírio Tropical",
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    tagline: {
      en: "Bringing tropical funk to Espírito Santo's music scene",
      pt: "Levando o funk tropical para a cena musical do Espírito Santo",
    },
    brief: {
      en: "The festival's visual identity channels this spirit into a bold and immersive experience. Wild, surreal, and electrifying, it blends vibrant colors, halftone textures, and striking graphic compositions. The result is a retro-futuristic aesthetic infused with adventure and dreamlike intensity — where music and visuals collide in hypnotic harmony.",
      pt: "A identidade visual do festival canaliza esse espírito para uma experiência ousada e imersiva. Selvagem, surreal e eletrizante, mistura cores vibrantes, texturas em retícula e composições gráficas marcantes. O resultado é uma estética retro-futurista impregnada de aventura e intensidade onírica — onde música e visuais colidem em harmonia hipnótica.",
    },
    context: {
      en: "Delírio Tropical is a music festival in Espírito Santo, Brazil, created to honor and amplify the region's rich cultural scene. Its first edition, held in January 2024, brought together 76 artists across diverse genres, celebrating the state's musical identity.",
      pt: "Delírio Tropical é um festival de música em Espírito Santo, Brasil, criado para honrar e amplificar a rica cena cultural da região. A primeira edição, realizada em janeiro de 2024, reuniu 76 artistas de gêneros diversos, celebrando a identidade musical do estado.",
    },
    tileImage: tile(1),
    indexImage: "/Images/all-projects/delirio-04.webp",
    gallery: fallbackGallery(0),
    credits: {
      items: [
        { role: ROLE.creativeLead, people: "Julia Paternostro" },
        { role: ROLE.copyConcept, people: "Yasmin Nariyoshi" },
        { role: ROLE.applicationDesign, people: "Geórgia Gomes" },
        { role: ROLE.eventPhotography, people: "Marcela Bicalho & Melina Furlan" },
      ],
      client: "GGZ.ART. & Puri Produções",
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
      { kind: "hero", src: asset("Delirio-Tropical", "02", "mp4") },
      { kind: "hero", src: asset("Delirio-Tropical", "03") },
      {
        kind: "cols",
        cols: 3,
        images: [
          asset("Delirio-Tropical", "04", "mp4"),
          asset("Delirio-Tropical", "05", "mp4"),
          asset("Delirio-Tropical", "06", "mp4"),
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
      { kind: "hero", src: asset("Delirio-Tropical", "12", "mp4") },
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
    credits: {
      items: [
        { role: ROLE.artLead, people: "Julia Paternostro" },
        { role: ROLE.conceptRationale, people: "Julia Paternostro" },
      ],
      client: "Vivs",
    },
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    title: "Vivs",
    tagline: {
      en: "Inviting travelers to live and discover a city",
      pt: "Convidando viajantes a viver e descobrir uma cidade",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    brief: {
      en: "Vivs is a travel brand that invites people to live and discover a city through its art, culture, and everyday life. Its first universe is built around Amsterdam — canals, bridges, windmills, tulips, and bikes — turned into a playful invitation to explore.",
      pt: "Vivs é uma marca de viagem que convida as pessoas a viver e descobrir uma cidade através da sua arte, cultura e cotidiano. Seu primeiro universo é construído em torno de Amsterdã — canais, pontes, moinhos, tulipas e bicicletas — transformados em um convite lúdico para explorar.",
    },
    context: {
      en: "The identity mixes a chunky retro wordmark, a friendly traveling character, and a bold palette of orange, lilac, and green over grainy textures. Original illustrations and flexible social-media templates carry the brand across posts, stories, and printed pieces, keeping the tone vibrant, warm, and full of personality.",
      pt: "A identidade combina um logotipo retrô encorpado, uma personagem viajante simpática e uma paleta ousada de laranja, lilás e verde sobre texturas granuladas. Ilustrações autorais e templates flexíveis para redes sociais levam a marca por posts, stories e peças impressas, mantendo o tom vibrante, caloroso e cheio de personalidade.",
    },
    tileImage: "/Images/Vivs/1.webp",
    gallery: [
      "/Images/Vivs/1.webp",
      "/Images/Vivs/2.webp",
      "/Images/Vivs/3.webp",
      "/Images/Vivs/5.webp",
      "/Images/Vivs/6.webp",
      "/Images/Vivs/8.webp",
      "/Images/Vivs/9.webp",
      "/Images/Vivs/11.webp",
      "/Images/Vivs/13.webp",
      "/Images/Vivs/14.webp",
      "/Images/Vivs/16.webp",
      "/Images/Vivs/17.webp",
    ],
    // Case-study layout — each image keeps its own aspect (no cropping):
    // landscape 1800×1105, wide banner 1800×855, portrait 1342×1682.
    sections: [
      { kind: "hero", src: "/Images/Vivs/1.mp4", ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 2,
        images: ["/Images/Vivs/11.webp", "/Images/Vivs/13.webp"],
        ratio: "1342/1682",
      },
      { kind: "hero", src: "/Images/Vivs/2.webp", ratio: "1800/855" },
      {
        kind: "cols",
        cols: 3,
        images: [
          "/Images/Vivs/16.webp",
          "/Images/Vivs/5.mp4",
          "/Images/Vivs/8.mp4",
        ],
        ratio: "1342/1682",
      },
      { kind: "hero", src: "/Images/Vivs/14.webp", ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 2,
        images: ["/Images/Vivs/6.mp4", "/Images/Vivs/9.webp"],
        ratio: "1800/1105",
      },
      { kind: "hero", src: "/Images/Vivs/3.mp4", ratio: "1800/1105" },
      { kind: "hero", src: "/Images/Vivs/17.webp", ratio: "1800/1105" },
    ],
    bg: "#2d7c3b",
  },
  // ---------------------------------------------------------------------------
  // 3. Budapest Forró Festival — no Framer page yet; placeholder copy.
  // ---------------------------------------------------------------------------
  {
    slug: "budapest-forro",
    credits: {
      items: [
        { role: ROLE.artLead, people: "Julia Paternostro" },
        { role: ROLE.conceptRationale, people: "Julia Paternostro" },
      ],
      client: "Budapest Forró Festival",
    },
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    title: "Budapest Forró Festival",
    tagline: {
      en: "Bringing Brazilian forró to the heart of Budapest",
      pt: "Levando o forró brasileiro ao coração de Budapeste",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    brief: {
      en: "Budapest Forró Festival is a three-day celebration of forró — the dance, the music and the culture — set on Margaret Island in Budapest. The program brings together workshops for all levels, open-air dances with community DJs, live bands at night, percussion sessions, a cultural exhibition and a collective picnic in the park.",
      pt: "O Budapest Forró Festival é uma celebração de três dias do forró — a dança, a música e a cultura — na Ilha Margarida, em Budapeste. A programação reúne workshops para todos os níveis, bailes ao ar livre com DJs da comunidade, bandas ao vivo à noite, oficinas de percussão, uma exposição cultural e um piquenique coletivo no parque.",
    },
    context: {
      en: "The identity turns forró into a warm, cut-paper world: a dancing couple, a dove, a windmill and tropical foliage layered over a red-to-orange gradient, with a hand-drawn wordmark that moves like the dance itself. Applied across posters, social media and event pieces, the system keeps the festival's invitation clear and vibrant — a gathering to dance, listen, learn and come together.",
      pt: "A identidade transforma o forró num universo caloroso em recorte de papel: um casal dançando, uma pomba, um moinho e folhagens tropicais sobre um gradiente do vermelho ao laranja, com um logotipo desenhado à mão que se move como a própria dança. Aplicada em cartazes, redes sociais e peças do evento, mantém o convite do festival claro e vibrante — um encontro para dançar, ouvir, aprender e se reunir.",
    },
    tileImage: asset("budapest-forro", "1"),
    gallery: [
      asset("budapest-forro", "1"),
      asset("budapest-forro", "2"),
      asset("budapest-forro", "6"),
      asset("budapest-forro", "9"),
      asset("budapest-forro", "10"),
      asset("budapest-forro", "11"),
      asset("budapest-forro", "12"),
      asset("budapest-forro", "13"),
      asset("budapest-forro", "14"),
    ],
    // Case-study layout — real webp exports, each keeping its native aspect:
    // wide landscapes (1800×1105 / 1800×1013), tall portraits (1342×1682),
    // and a 3-col strip of narrow portraits (877×1217).
    sections: [
      { kind: "hero", src: asset("budapest-forro", "1"), ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 2,
        images: [asset("budapest-forro", "7", "mp4"), asset("budapest-forro", "8")],
        ratio: "1342/1682",
      },
      { kind: "hero", src: asset("budapest-forro", "2"), ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 3,
        images: [
          asset("budapest-forro", "3"),
          asset("budapest-forro", "4"),
          asset("budapest-forro", "5"),
        ],
        ratio: "877/1217",
      },
      { kind: "hero", src: asset("budapest-forro", "6"), ratio: "1800/1105" },
      { kind: "hero", src: asset("budapest-forro", "9"), ratio: "1800/1105" },
      { kind: "hero", src: asset("budapest-forro", "11"), ratio: "1800/1013" },
      { kind: "hero", src: asset("budapest-forro", "12"), ratio: "1800/1013" },
      { kind: "hero", src: asset("budapest-forro", "10"), ratio: "1800/1105" },
      { kind: "hero", src: asset("budapest-forro", "13"), ratio: "1800/1013" },
      { kind: "hero", src: asset("budapest-forro", "14"), ratio: "1800/1013" },
    ],
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
    credits: {
      items: [
        { role: ROLE.artLead, people: "Julia Paternostro" },
        { role: ROLE.conceptRationale, people: "Julia Paternostro" },
        { role: ROLE.applicationDesign, people: "Geórgia Gomes" },
        { role: ROLE.eventPhotography, people: "Vagner Resende" },
      ],
      client: "GGZ.ART. & Puri Produções",
    },
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    title: "Delírio Tropical — São João",
    tagline: {
      en: "Reimagining Delírio Tropical for the São João season",
      pt: "Reimaginando o Delírio Tropical para o São João",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2025",
    brief: {
      en: "Delírio Tropical – São João is a festival that celebrates the energy and diversity of the June festivities, bringing together forró, symbols of the Northeast, and the traditions of Espírito Santo in a unique experience.",
      pt: "O Delírio Tropical – São João é um festival que celebra a energia e a diversidade das festas juninas, reunindo o forró, os símbolos do Nordeste e as tradições do Espírito Santo em uma experiência única.",
    },
    context: {
      en: "This was the second time I developed the visual identity for the festival. However, in this edition, the challenge was different: the São João theme introduced a new creative starting point, requiring a visual universe entirely distinct from previous editions. For the special 2025 edition, accordions, zabumbas, triangles, flowers, and tropical foliage were reinvented in a vibrant graphic universe full of personality. The warm and intense palette, combined with striking visual elements, conveys the heat of tropical nights and the festive spirit of São João. The visual identity project ranges from the development of the logo and original illustrations to the creation of a cohesive and versatile graphic universe. Applied to online and offline pieces, from posters and t-shirts to social media content and event decor, the identity ensures consistent, engaging communication that is faithful to the atmosphere of the festival.",
      pt: "Esta foi a segunda vez que desenvolvi a identidade visual para o festival. Mas, nesta edição, o desafio foi outro: a temática de São João trouxe um novo ponto de partida criativo, exigindo um universo visual completamente diferente das edições anteriores. Nessa edição especial de 2025, sanfonas, zabumbas, triângulos, flores e folhagens tropicais foram reinventados em um universo gráfico vibrante e cheio de personalidade. A paleta quente e intensa, combinada a elementos visuais marcantes, traduz o calor das noites tropicais e o espírito festivo do São João. O projeto de identidade visual abrange desde o desenvolvimento do logotipo e das ilustrações autorais à criação de um universo gráfico coeso e versátil. Aplicada em peças online e offline, de cartazes e camisetas a conteúdos para redes sociais e ambientação do evento, a identidade garante uma comunicação consistente, envolvente e fiel à atmosfera do festival.",
    },
    tileImage: tile(4),
    indexImage: "/Images/all-projects/sao-joao-04.webp",
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
      { kind: "hero", src: asset("Delirio-Sao-Joao", "02", "mp4"), ratio: "2740 / 1599" },
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
      { kind: "hero", src: asset("Delirio-Sao-Joao", "09", "mp4"), ratio: "2740 / 1542" },
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
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    hidden: true,
    title: "Prêmio Inoves",
    tagline: {
      en: "Celebrating innovation with a bold award identity",
      pt: "Celebrando a inovação com uma identidade de prêmio ousada",
    },
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
    credits: {
      items: [
        { role: ROLE.artLead, people: "Julia Paternostro" },
        { role: ROLE.creativeConcept, people: "Gabriel Barcellos & Julia Paternostro" },
        { role: ROLE.copywriting, people: "Gabriel Barcelos" },
      ],
      client: "Galpão Produções & IBCA",
    },
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    title: "30º Festival de Cinema de Vitória",
    tagline: {
      en: "Marking 30 years of the Vitória Film Festival",
      pt: "Marcando os 30 anos do Festival de Cinema de Vitória",
    },
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
    indexImage: "/Images/all-projects/30-fcv-04.webp",
    gallery: fallbackGallery(5),
    bg: "#ffd9d9",
    // Case-study layout — 26 re-exported images under
    // public/Images/30-FCV/ (01–26), grouped by native aspect ratio:
    //   - 01–06, 16–18, 25–26 → hero (1.63:1 landscape)
    //   - 07–15, 19–21        → 3-col square rows (1:1)
    //   - 22–24               → 3-col portrait row (0.72:1, cols3 default)
    // Explicit ratios prevent object-cover cropping.
    sections: [
      { kind: "hero", src: asset("30-FCV", "01", "mp4"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "02"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "03", "mp4"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "04", "mp4"), ratio: "2740 / 1682" },
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
    credits: {
      items: [
        { role: ROLE.artLead, people: "Julia Paternostro" },
        { role: ROLE.creativeConcept, people: "Gabriel Barcellos & Julia Paternostro" },
        { role: ROLE.copywriting, people: "Gabriel Barcelos" },
        { role: ROLE.setDesign, people: "Joyce Castello" },
        { role: ROLE.eventPhotography, people: "Marcela Bicalho & Melina Furlan" },
      ],
      client: "Galpão Produções & IBCA",
    },
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    title: "Tenda Lab",
    tagline: {
      en: "Building a festival brand around Brazilian music",
      pt: "Construindo a marca de um festival de música brasileira",
    },
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
      { kind: "hero", src: asset("Tenda-Lab", "01", "mp4"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("Tenda-Lab", "02", "mp4"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("Tenda-Lab", "03"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "04"), ratio: "2740 / 1542" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "05", "mp4"),
          asset("Tenda-Lab", "06", "mp4"),
          asset("Tenda-Lab", "07", "mp4"),
        ],
      },
      // Wide banner — 2740×755 (~3.63:1). Full-width strip.
      { kind: "hero", src: asset("Tenda-Lab", "08"), ratio: "2740 / 755" },
      { kind: "hero", src: asset("Tenda-Lab", "09"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "10"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "11", "mp4"), ratio: "2740 / 1456" },
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
    deliverables: {
      en: "Concept, Illustration, Art direction",
      pt: "Conceito, Ilustração, Direção de arte",
    },
    hidden: true,
    title: "Samba que eu quero ver",
    tagline: {
      en: "Celebrating samba through illustration",
      pt: "Celebrando o samba através da ilustração",
    },
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
    hidden: true,
    deliverables: {
      en: "Concept, Illustration, Art direction",
      pt: "Conceito, Ilustração, Direção de arte",
    },
    title: "Leather",
    tagline: {
      en: "Making web3 finance feel human through illustration",
      pt: "Tornando as finanças web3 mais humanas com ilustração",
    },
    category: { en: "Illustration", pt: "Ilustração" },
    year: "2024",
    brief: {
      en: "Leather is a Bitcoin wallet, and this is a series of illustrations made for its product and communication. The set translates web3 concepts — earning yield on your balance, stablecoins, moving value — in a light, human way, so features feel approachable rather than technical.",
      pt: "A Leather é uma carteira de Bitcoin, e esta é uma série de ilustrações criada para seu produto e comunicação. O conjunto traduz conceitos de web3 — render sobre o saldo, stablecoins, movimentação de valor — de um jeito leve e humano, deixando as funcionalidades mais acessíveis e menos técnicas.",
    },
    context: {
      en: "Drawn as single-weight white line art on black, each piece leans on everyday metaphors — a coin squeezed like a lime over a cocktail, a savings jar filling with coins — to make finance feel playful. The restrained, monochrome style keeps the illustrations flexible across the interface, docs and social, adapting to different messages while staying part of one visual family.",
      pt: "Desenhadas como linhas brancas de espessura única sobre fundo preto, cada peça aposta em metáforas do dia a dia — uma moeda espremida como um limão sobre um coquetel, um pote de poupança se enchendo de moedas — para tornar as finanças mais lúdicas. O estilo monocromático e contido mantém as ilustrações flexíveis pela interface, docs e redes, adaptando-se a diferentes mensagens sem perder a unidade visual.",
    },
    tileImage: asset("leather", "1"),
    gallery: [
      asset("leather", "1"),
      asset("leather", "15"),
      asset("leather", "14"),
      asset("leather", "16"),
      asset("leather", "17"),
      asset("leather", "18"),
      asset("leather", "19"),
    ],
    // Case-study layout — real webp exports: a hero landscape, square
    // illustration strips (877×877), tall portraits (877×1025), and wide
    // banners (1800×615 / 1800×593 / 1330×873).
    sections: [
      { kind: "hero", src: asset("leather", "1"), ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 3,
        images: [asset("leather", "2"), asset("leather", "3"), asset("leather", "4")],
        ratio: "877/877",
      },
      {
        kind: "cols",
        cols: 3,
        images: [asset("leather", "5"), asset("leather", "6"), asset("leather", "7")],
        ratio: "877/877",
      },
      { kind: "hero", src: asset("leather", "15"), ratio: "1800/992" },
      {
        kind: "cols",
        cols: 3,
        images: [asset("leather", "8"), asset("leather", "9"), asset("leather", "10")],
        ratio: "877/1025",
      },
      {
        kind: "cols",
        cols: 3,
        images: [asset("leather", "11"), asset("leather", "12"), asset("leather", "13")],
        ratio: "877/1025",
      },
      { kind: "hero", src: asset("leather", "14"), ratio: "1800/615" },
      {
        kind: "cols",
        cols: 2,
        images: [asset("leather", "16"), asset("leather", "17")],
        ratio: "1800/593",
      },
      {
        kind: "cols",
        cols: 2,
        images: [asset("leather", "18"), asset("leather", "19")],
        ratio: "1330/873",
      },
    ],
    bg: "#0a0a0a",
  },
  // ---------------------------------------------------------------------------
  // 10. A Selva — Framer content.
  // ---------------------------------------------------------------------------
  {
    slug: "a-selva",
    credits: {
      items: [
        { role: ROLE.artLead, people: "Julia Paternostro" },
        { role: ROLE.copyConcept, people: "Gabriel Barcelos" },
        { role: ROLE.applicationDesign, people: "Geórgia Gomes" },
        { role: ROLE.muralExecution, people: "Renato Pontello, Juliana Almeida, Ed Brown & Natã" },
        { role: ROLE.photography, people: "Vikki Dessauni" },
      ],
      client: "GGZ.ART.",
    },
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    title: "A Selva",
    tagline: {
      en: "Turning a nightlife venue into a jungle of freedom",
      pt: "Transformando uma casa noturna numa selva de liberdade",
    },
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
    tileImage: asset("selva", "1"),
    gallery: [
      asset("selva", "1"),
      asset("selva", "2"),
      asset("selva", "7"),
      asset("selva", "8"),
      asset("selva", "9"),
      asset("selva", "16"),
    ],
    // Case-study layout — real webp exports: hero landscapes (1800×1105),
    // wide banners (1800×870), square illustrations (877×877), and tall
    // portraits (877×1217). (Source had a duplicate 9-1 → 9 only.)
    sections: [
      { kind: "hero", src: asset("selva", "1"), ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 3,
        images: [asset("selva", "3"), asset("selva", "4"), asset("selva", "5")],
        ratio: "877/877",
      },
      { kind: "hero", src: asset("selva", "2", "mp4"), ratio: "1800/870" },
      {
        kind: "cols",
        cols: 3,
        images: [asset("selva", "10"), asset("selva", "11"), asset("selva", "12")],
        ratio: "877/877",
      },
      { kind: "hero", src: asset("selva", "7"), ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 3,
        images: [asset("selva", "13"), asset("selva", "14"), asset("selva", "15")],
        ratio: "877/1217",
      },
      { kind: "hero", src: asset("selva", "6"), ratio: "1800/870" },
      {
        kind: "cols",
        cols: 3,
        images: [asset("selva", "17"), asset("selva", "18"), asset("selva", "19")],
        ratio: "877/1217",
      },
      { kind: "hero", src: asset("selva", "8"), ratio: "1800/1105" },
      {
        kind: "cols",
        cols: 3,
        images: [asset("selva", "20"), asset("selva", "21"), asset("selva", "22")],
        ratio: "877/1217",
      },
      { kind: "hero", src: asset("selva", "16"), ratio: "1800/1105" },
      { kind: "hero", src: asset("selva", "9"), ratio: "1800/1105" },
    ],
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
    deliverables: {
      en: "Branding, Illustration, Creative direction",
      pt: "Branding, Ilustração, Direção criativa",
    },
    hidden: true,
    title: "CineMarias",
    tagline: {
      en: "Celebrating feminine identities through cinema",
      pt: "Celebrando identidades femininas através do cinema",
    },
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
    deliverables: {
      en: "Concept, Illustration, Art direction",
      pt: "Conceito, Ilustração, Direção de arte",
    },
    hidden: true,
    title: "Human or Machine?",
    tagline: {
      en: "Illustrating the bond between humans and machines",
      pt: "Ilustrando a relação entre humanos e máquinas",
    },
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
  // ---------------------------------------------------------------------------
  // 13. Xou da Xoxa — personal / course project (Notion slug "xoxa"). EN copy
  //     translated from the Notion PT description + credits.
  // ---------------------------------------------------------------------------
  {
    slug: "xoxa",
    credits: {
      items: [
        {
          role: {
            en: "Art Direction, Illustration & Lettering",
            pt: "Direção de Arte, Ilustração e Lettering",
          },
          people: "Julia Paternostro",
        },
        {
          role: { en: "Course", pt: "Curso" },
          people: "Direção e Produção de Ilustrações — Aprender Design",
        },
        { role: { en: "Mentorship", pt: "Orientação" }, people: "Jun Ioneda" },
      ],
    },
    deliverables: {
      en: "Art Direction and Illustration",
      pt: "Conceito, Direção de Arte e Ilustração",
    },
    title: "Xou da Xoxa",
    tagline: {
      en: "Fictional cover reimagining a pop icon.",
      pt: "Capa fictícia que reimagina um ícone pop.",
    },
    category: { en: "Illustration", pt: "Ilustração" },
    year: "2025",
    brief: {
      en: "Xou da Xoxa is a self-initiated project made as the final work for the Illustration Direction & Production course at Aprender Design. The brief was to take an existing album and reinterpret it in a language of my own. I chose Xou da Xuxa (1986) and turned it into an acid parody — a comic, darker retelling that draws on the urban legends and conspiracy theories that always surrounded the original: subliminal messages, demonic pacts, and the “X” as an occult symbol.",
      pt: "Xou da Xoxa é um projeto autoral desenvolvido como trabalho final do curso Direção e Produção de Ilustrações, da Aprender Design. A premissa foi partir de um álbum existente e reinterpretá-lo através de uma linguagem própria. Escolhi o Xou da Xuxa (1986) e o transformei em uma paródia ácida: uma releitura cômica e sombria que bebe nas lendas urbanas e teorias conspiratórias que sempre cercaram a obra original, como mensagens subliminares, pactos demoníacos e o “X” como símbolo ocultista.",
    },
    context: {
      en: "Out of that imagery comes the “Pop Star from Hell”: an androgynous, demonic figure inspired by Xuxa’s eighties aesthetic, at once nostalgic and unsettling. It is built entirely from illustration in mixed media — flat-color vector art with black outlines, digital collage, and a molten, metallic 3D lettering. Flames, halftone textures, and a warm palette complete the universe, applied across cover, vinyl, and t-shirt. As art director and illustrator, I signed the whole project end to end, from research and concept rationale to the final illustration.",
      pt: "Desse imaginário nasce a “Pop Star do Inferno”: uma figura andrógina e demoníaca, inspirada na estética oitentista da Xuxa, que provoca nostalgia e estranhamento ao mesmo tempo. A construção é toda ilustrada, em técnica mista: ilustração vetorial de cores chapadas e contorno preto, colagem digital e um lettering 3D metálico e derretido. Chamas, texturas de retícula e uma paleta quente completam o universo, aplicado em capa, vinil e camiseta. Como diretora de arte e ilustradora, assinei o projeto integralmente, da pesquisa e defesa conceitual à ilustração final.",
    },
    tileImage: asset("xou-da-xoxa", "01"),
    // Footer "All projects" cover — the pink vinyl mockup. It's the same crop
    // as the leftmost sheet image (Figma 459:6461), so we reuse that export
    // rather than shipping a near-duplicate file.
    indexImage: "/Images/all-projects/xuxa-04.webp",
    gallery: [
      asset("xou-da-xoxa", "01"),
      asset("xou-da-xoxa", "02"),
      asset("xou-da-xoxa", "03"),
      asset("xou-da-xoxa", "04"),
    ],
    // Case-study layout — 5 landscape frames (2740×1682) + 4 tall portraits
    // (1342×1682), interleaved.
    sections: [
      { kind: "hero", src: asset("xou-da-xoxa", "01"), ratio: "2740/1682" },
      { kind: "hero", src: asset("xou-da-xoxa", "02"), ratio: "2740/1682" },
      {
        kind: "cols",
        cols: 2,
        images: [asset("xou-da-xoxa", "06"), asset("xou-da-xoxa", "07")],
        ratio: "1342/1682",
      },
      { kind: "hero", src: asset("xou-da-xoxa", "03"), ratio: "2740/1682" },
      {
        kind: "cols",
        cols: 2,
        images: [asset("xou-da-xoxa", "08"), asset("xou-da-xoxa", "09")],
        ratio: "1342/1682",
      },
      { kind: "hero", src: asset("xou-da-xoxa", "04"), ratio: "2740/1682" },
      { kind: "hero", src: asset("xou-da-xoxa", "04-1"), ratio: "2740/1682" },
    ],
    bg: "#e0301e",
  },
];

/**
 * Display order for every listing surface (tile grid, index timeline, Show-all
 * sheet, case-study footer) — mirrors the manual row order of the shared Notion
 * database. `projects` is reordered by this list; any slug not present falls to
 * the end in source order. To reorder the site, reorder here (or reorder the
 * Notion view and copy the slugs across).
 */
const PROJECT_ORDER = [
  "delirio-tropical",
  "fcv",
  "a-selva",
  "delirio-sao-joao",
  "tenda-lab",
  "budapest-forro",
  "vivs",
  "xoxa",
  "cinemarias",
  "samba",
  "leather",
  "premio-inoves",
  "human-or-machine",
];

/** All projects, in the canonical PROJECT_ORDER. */
export const projects: Project[] = [...projectsSource].sort((a, b) => {
  const ia = PROJECT_ORDER.indexOf(a.slug);
  const ib = PROJECT_ORDER.indexOf(b.slug);
  return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
});

/**
 * The projects shown on the listing surfaces (index stage/timeline, Show-all
 * list, case-study related footer) — everything not flagged `hidden`. The full
 * `projects` array is kept for direct /work/[slug] routes and the editor.
 */
export const visibleProjects: Project[] = projects.filter((p) => !p.hidden);

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
