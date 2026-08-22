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
  /**
   * Kept off the index page's parallax stage and timeline only. Unlike
   * `hidden`, the project still appears in the Show-all sheet, the
   * case-study footer list and at /work/[slug]. Use for a project that has
   * no satellite composition built for the index yet.
   */
  hiddenFromIndex?: boolean;
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
export type SheetImage = { src: string; ratio: number; color: string };

/*
  Average colour of every sheet crop, measured off the exported file. It
  paints the image's box while the file is still downloading, so the sheet
  scrolls as a finished grid of colour that sharpens into photographs rather
  than a column of holes that shove the page around as they fill in. Picked
  the MEAN rather than the dominant colour: dominant lands on whichever flat
  area is largest and can be a bright outlier (buda-03's sky blue over a
  mostly-grey crop), while the mean is what the crop reads as from a distance
  — which is exactly what a placeholder is standing in for.
*/
const SHEET_COLORS: Record<string, string> = {
  "30-fcv-01": "#d68581", "30-fcv-02": "#9a8089", "30-fcv-03": "#e3c5c3", "30-fcv-04": "#f5231c",
  "buda-01": "#684848", "buda-02": "#cb1a39", "buda-03": "#6e756f", "buda-04": "#282524",
  "delirio-01": "#93955f", "delirio-02": "#d5924a", "delirio-03": "#8f726f", "delirio-04": "#596e5c",
  "sao-joao-01": "#5b6597", "sao-joao-02": "#866d5e", "sao-joao-03": "#855747", "sao-joao-04": "#4a4a48",
  "selva-01": "#534e29", "selva-02": "#e27296", "selva-03": "#14222c", "selva-04": "#d66052",
  "tenda-01": "#9b614f", "tenda-02": "#bcdc03", "tenda-03": "#cdadbb", "tenda-04": "#bb96ca",
  "vivs-01": "#9b883a", "vivs-02": "#a4847c", "vivs-03": "#8a769c", "vivs-04": "#a8898a",
  "xuxa-01": "#a18e6d", "xuxa-02": "#7b736c", "xuxa-03": "#ab7b64", "xuxa-04": "#c49fa2",
};

// `ratio` is the image's real w/h — the sheet lays each row out "justified"
// (widths ∝ ratio, one shared height), so nothing is cropped. Exported files
// are all 590px tall, so ratio = width / 590. Knowing the ratio up front is
// also what lets the placeholder reserve the exact box before the file lands.
const sheet = (name: string, ratio: number): SheetImage => ({
  src: `/Images/all-projects/${name}.webp`,
  ratio,
  color: SHEET_COLORS[name] ?? "#1a1a1a",
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
      en: "Creative Direction, Visual Identity & Illustration",
      pt: "Direção Criativa, Identidade Visual e Ilustração",
    },
    tagline: {
      en: "Brand for a music festival in Espírito Santo.",
      pt: "Marca para um festival de música no Espírito Santo.",
    },
    brief: {
      en: "Delírio Tropical is a music festival in Espírito Santo dedicated to putting the region's cultural scene in view. Its premise is the unlikely meeting: at every show, two unrelated bands share the stage, and the festival's concept comes out of that collision of repertoires. The first edition, in January 2024 on Itapuã beach in Vila Velha, brought 76 artists together in that format. The visual identity was built to give the idea a shape. Wild, surreal and retro-futurist, it works vibrant colour, halftone textures and graphic compositions of real presence. At the centre of the system is an illustrated character, animal and dreamlike in line, created to distil the mix of sounds, styles and references that defines the festival.",
      pt: "Delírio Tropical é um festival de música do Espírito Santo dedicado a evidenciar a cena cultural da região. Sua premissa é o encontro improvável: a cada apresentação, duas bandas sem relação entre si dividem o palco, e é dessa colisão de repertórios que surge o conceito do festival. A primeira edição, em janeiro de 2024, na praia de Itapuã (Vila Velha–ES), reuniu 76 artistas nesse formato. A identidade visual foi construída para dar forma a essa proposta. Selvagem, surreal e retro-futurista, ela articula cores vibrantes, texturas de retícula e composições gráficas de forte presença. No centro do sistema está uma personagem ilustrada de traço animalesco e onírico, criada para sintetizar a mistura de sons, estilos e referências que define o festival.",
    },
    context: {
      en: "As art director, designer and illustrator, I created the festival's visual identity in full, from the logotype to the character and the graphic system applied across posters, social media and the event's environment. Every illustration is my own.",
      pt: "Como diretora de arte, designer e ilustradora, criei a identidade visual do festival em sua totalidade, do logotipo à personagem e ao sistema gráfico aplicado a cartazes, redes e ambientação do evento. Todas as ilustrações são de minha autoria.",
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
          asset("Delirio-Tropical", "04", "gif"),
          asset("Delirio-Tropical", "05", "gif"),
          asset("Delirio-Tropical", "06", "gif"),
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
      en: "Creative Direction, Visual Identity & Illustration",
      pt: "Direção Criativa, Identidade Visual e Ilustração",
    },
    title: "Vivs",
    tagline: {
      en: "Travel brand inviting you to live and discover.",
      pt: "Marca de viagem que convida a viver e descobrir.",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    brief: {
      en: "Vivs connects Brazil and Amsterdam through the eyes of someone who lives between cultures, bringing travel and art together. The brand unfolds into two sister arms: Vivs Tour, which shows the city through an affectionate curation, far from generic tourism; and Vivs Backstage, which gives structure to artists and cultural producers moving between the two countries. The challenge was to build a single identity that could hold both. The solution was to treat them as sister brands: same logotype, same palette, changing only the signature that accompanies each. Hand-drawn, the logotype balances rounded forms against cuts that bring both warmth and seriousness. Illustration leads the system: a curious character makes her way through the city, alongside elements made partly for both brands and partly for each arm. Organic graphics, grainy textures and a vibrant palette complete a young, contemporary world.",
      pt: "Vivs conecta Brasil e Amsterdam a partir do olhar de quem vive entre culturas, unindo viagem e arte. A marca se desdobra em duas frentes irmãs: a Vivs Tour, que mostra a cidade com curadoria afetiva, longe do turismo genérico; e a Vivs Backstage, que dá estrutura a artistas e produtores culturais em trânsito entre os dois países. O desafio foi construir uma identidade única que abrigasse as duas. A solução foi tratá-las como marcas-irmãs: mesmo logotipo, mesma paleta, mudando apenas a assinatura que acompanha cada uma. Desenhado à mão, o logotipo equilibra formas arredondadas e cortes que trazem acolhimento e seriedade. A ilustração conduz o sistema: uma personagem curiosa percorre a cidade, ao lado de elementos criados parte para as duas marcas, parte para cada frente. Grafismos orgânicos, texturas granuladas e uma paleta vibrante completam um universo jovem e contemporâneo.",
    },
    context: {
      en: "As art director, I carried out the project end to end, from research through to the logotype, the system for both brands and the illustrations.",
      pt: "Como diretora de arte, realizei o projeto integralmente, da pesquisa ao logotipo, ao sistema das duas marcas e às ilustrações.",
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
      en: "Art Direction and Visual Identity",
      pt: "Direção de Arte e Identidade Visual",
    },
    title: "Budapest Forró Festival",
    tagline: {
      en: "Brand for a forró festival in Budapest.",
      pt: "Marca para um festival de forró em Budapeste.",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2024",
    brief: {
      en: "Budapest Forró Festival is an international forró gathering held on Margaret Island, in the middle of the Danube, across three days of concerts, dances and workshops. In a conservative political context, the festival builds itself as a territory of cultural exchange, freedom and welcome — above all for women and LGBTQIA+ people.\nDeveloped for the festival's first edition, in 2026, the work starts from one central decision: to carry forró's Brazilian origin across reinterpreted, as cultural inspiration, while stepping away from the clichés of the June festivities. In the logotype, two figures dance entwined, ungendered, over a custom typeface that holds rhythm and movement. A hot, vibrant palette contrasts with the green of the island, and organic graphics extend the system.",
      pt: "Budapest Forró Festival é um encontro internacional de forró realizado na Ilha Margarida, no meio do Rio Danúbio, com três dias de shows, bailes e oficinas. Em um contexto político conservador, o festival se constrói como território de troca cultural, liberdade e acolhimento, sobretudo para mulheres e pessoas LGBTQIA+.\nDesenvolvida para a primeira edição do festival, em 2026, a construção parte de uma decisão central: trazer a origem brasileira do forró de forma reinterpretada, como inspiração cultural, mas afastando-se dos clichês da festa junina. No logotipo, duas figuras dançam entrelaçadas, sem definição de gênero, sobre uma tipografia customizada que carrega ritmo e movimento. Uma paleta quente e vibrante contrasta com o verde da ilha, e os grafismos orgânicos estendem o sistema.",
    },
    context: {
      en: "I carried out the visual identity project end to end, from research and concept rationale through to the logotype, typography, palette and graphics.",
      pt: "Realizei o projeto de identidade visual integralmente, da pesquisa e defesa conceitual ao logotipo, tipografia, paleta e grafismos.",
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
        images: [asset("budapest-forro", "7", "gif"), asset("budapest-forro", "8")],
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
      en: "Creative Direction, Visual Identity & Illustration",
      pt: "Direção Criativa, Identidade Visual e Ilustração",
    },
    title: "Delírio Tropical — São João",
    tagline: {
      en: "The São João edition of Delírio Tropical.",
      pt: "A edição de São João do Delírio Tropical.",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2025",
    brief: {
      en: "Delírio Tropical São João is the festival's June edition, where forró, the São João festivities and the culture of the Northeast and of Espírito Santo meet in a tropical celebration. The identity starts from that mixture to build an imagery of its own: rather than falling back on the usual June symbols, it reinvents them with humour and delirium. And rather than the sunlit, daytime São João of habit, we made the call to give it a nocturnal identity — one that carries the heat of parties running through to dawn.\nThe system is illustrated throughout. Flowers, leaves and plants come alive and fuse with the instruments of forró — accordions, zabumbas and triangles — giving rise to figures like the accordion-flower, which brings a touch of magic to the party. A hand-drawn lettering logotype and a hot, intense palette complete a world that evokes the warmth of São João nights.",
      pt: "Delírio Tropical São João é a edição junina do festival, onde o forró, as festas de São João e a cultura do Nordeste e do Espírito Santo se encontram em uma celebração tropical. A identidade parte dessa mistura para construir um imaginário próprio: em vez de recorrer aos símbolos juninos de sempre, reinventa-os com humor e delírio. Além disso, em vez do São João diurno e ensolarado de sempre, assumimos a decisão de trazer uma identidade noturna, que traduz o calor das festas que atravessam a madrugada.\nO sistema é inteiramente ilustrado. Flores, folhas e plantas ganham vida e se fundem a instrumentos do forró, como sanfonas, zabumbas e triângulos, dando origem a figuras como a flor-sanfoneira que traz um toque de magia à festa. O logotipo, em lettering desenhado à mão, e uma paleta quente e intensa completam um universo que evoca o calor das noites de São João.",
    },
    context: {
      en: "As art director, I signed the visual identity, the lettering and every illustration in the project.",
      pt: "Como diretora de arte, assinei a identidade visual, lettering e todas as ilustrações do projeto.",
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
      en: "Art Direction, Visual Identity and Illustration",
      pt: "Direção de Arte, Identidade Visual e Ilustração",
    },
    hidden: true,
    title: "Prêmio Inoves",
    tagline: {
      en: "Visual identity for a public-sector innovation award.",
      pt: "Identidade visual para um prêmio de inovação do serviço público.",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "Prêmio Inoves recognises the people who innovate in Espírito Santo's public service. In its 17th edition, the challenge was to demystify innovation: to take it off the pedestal of the extraordinary and the technological and show it as what it actually is — a human, everyday attitude, made of small decisions that add up into a legacy. Out of that movement, from the individual gesture to the impact that stays, comes the line “your attitude generates value, your practice transforms”. The identity gives that idea a body, balancing institutional weight against freshness. Everything is illustrated in vector line: heads and hands carry the human presence, a diamond stands for the value generated, and directional graphics set the pieces in motion. Purple and orange hold the continuity, widened by new colours and gradients, while a volumetric 3D lettering supplies the final charge.",
      pt: "O Prêmio Inoves reconhece quem inova no serviço público do Espírito Santo. Na sua 17ª edição, o desafio era desmistificar a inovação: tirá-la do pedestal do extraordinário e do tecnológico para mostrá-la como o que ela realmente é: uma atitude humana e cotidiana, feita de pequenas decisões que, somadas, viram legado. É desse movimento, do gesto individual ao impacto que permanece, que nasce o mote “Sua atitude gera valor, sua prática transforma”. A identidade dá corpo a essa ideia equilibrando peso institucional e frescor. Tudo é ilustrado em traço vetorial: cabeças e mãos trazem a presença humana, um diamante traduz o valor gerado e grafismos direcionais colocam as peças em movimento. O roxo e o laranja garantem continuidade, ampliados por novas cores e degradês, enquanto um lettering 3D volumétrico dá a energia final.",
    },
    context: {
      en: "As art director, I signed the visual identity, the lettering and every illustration. The concept and narrative strategy were developed in partnership with Gabriel Barcellos, who also wrote the copy.",
      pt: "Como diretora de arte, assinei a identidade visual, o lettering e todas as ilustrações. O conceito e a estratégia narrativa foram desenvolvidos em parceria com Gabriel Barcellos, responsável também pela redação.",
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
      en: "Creative Direction, Visual Identity & Illustration",
      pt: "Direção Criativa, Identidade Visual e Ilustração",
    },
    title: "30º Festival de Cinema de Vitória",
    tagline: {
      en: "Identity for the 30th Vitória Film Festival.",
      pt: "Identidade para o 30º Festival de Cinema de Vitória.",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "The Vitória Film Festival reached its 30th edition. The visual identity was developed for that anniversary on one premise: to honour and draw together the people who keep the flame of cinema alight — the different generations who love it. The system organises itself around three ideas: resistance, celebration and evolution. Each translates into graphic elements of its own, such as flames, stars and eyes. The characters hold the centre of the system: of different ages, walking in the same direction, they stand for the passing of a legacy between generations and for cinema's permanent reinvention.",
      pt: "Festival de Cinema de Vitória chegou à sua 30ª edição. A identidade visual foi desenvolvida para o aniversário com a premissa de enaltecer e aproximar os que mantêm a chama do audiovisual acesa: as diferentes gerações de apaixonados por cinema. O sistema se organiza em torno de três conceitos: resistência, celebração e evolução. Cada um deles se traduz em elementos gráficos próprios, como chamas, estrelas e olhos. As personagens ocupam o centro do sistema: de diferentes idades, e caminhando na mesma direção, representam a transmissão de legado entre gerações e a permanente reinvenção do cinema.",
    },
    context: {
      en: "As art director, I was responsible for the visual identity and every illustration, leading the translation of the concept into a graphic system and its characters. The creative concept was developed in partnership with Gabriel Barcellos, who also wrote the copy.",
      pt: "Como diretora de arte, respondi pela identidade visual e por todas as ilustrações, conduzindo a tradução do conceito em sistema gráfico e personagens. O conceito criativo foi desenvolvido em parceria com Gabriel Barcellos, responsável também pela redação.",
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
      { kind: "hero", src: asset("30-FCV", "01", "gif"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "02"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "03", "gif"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("30-FCV", "04", "gif"), ratio: "2740 / 1682" },
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
      en: "Creative Direction, Visual Identity & Illustration",
      pt: "Direção Criativa, Identidade Visual e Ilustração",
    },
    title: "Tenda Lab",
    tagline: {
      en: "Brand for a festival of Brazilian music.",
      pt: "Marca para um festival de música brasileira.",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "Tenda Lab is a festival celebrating the diversity of Brazilian music, gathering artists across generations, styles and musical strands. In its 8th edition, the event embraced the theme “everyone comes”, holding up plurality as a creative force and as the connector between artists and audience.\nThe visual identity was built around that vibrant, collective spirit. Bright colours, modular shapes and wave-inspired graphics create a dynamic visual world. The characters — diverse, and combinable with one another — give the “everyone comes” line a body, and complete the festival's vibrant, inclusive atmosphere.",
      pt: "O Tenda Lab é um festival que celebra a diversidade da música brasileira, reunindo artistas de diferentes gerações, estilos e vertentes musicais. Em sua 8ª edição, o evento abraçou o tema “vem todo mundo”, destacando a pluralidade como força criativa e conector entre artistas e público.\nA identidade visual foi construída em torno desse espírito vibrante e coletivo. Cores vivas, formas modulares e grafismos inspirados em ondas criam um universo visual dinâmico. As personagens diversas e combináveis entre si, materializam o mote “vem todo mundo” e completam a atmosfera vibrante e inclusiva do festival.",
    },
    context: {
      en: "As art director and illustrator, I led the translation of the concept into a graphic system and its characters. The conceptual development was done as a pair with Gabriel Barcellos, who also wrote the copy.",
      pt: "Como diretora de arte e ilustradora, conduzi a tradução do conceito em sistema gráfico e personagens. O desenvolvimento conceitual foi feito em dupla com Gabriel Barcellos, responsável também pela redação.",
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
      { kind: "hero", src: asset("Tenda-Lab", "02", "gif"), ratio: "2740 / 1682" },
      { kind: "hero", src: asset("Tenda-Lab", "03"), ratio: "2740 / 1542" },
      { kind: "hero", src: asset("Tenda-Lab", "04"), ratio: "2740 / 1542" },
      {
        kind: "cols",
        cols: 3,
        ratio: "1 / 1",
        images: [
          asset("Tenda-Lab", "05", "gif"),
          asset("Tenda-Lab", "06", "gif"),
          asset("Tenda-Lab", "07", "gif"),
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
      en: "Art Direction, Visual Identity & Illustration",
      pt: "Direção de Arte, Identidade Visual e Ilustração",
    },
    title: "A Selva",
    tagline: {
      en: "Brand for a multicultural venue in Vitória.",
      pt: "Marca para uma casa multicultural em Vitória.",
    },
    category: { en: "Branding", pt: "Branding" },
    year: "2023",
    brief: {
      en: "A Selva is a multicultural venue in the heart of Vitória, Espírito Santo, bringing together concerts, festivals and themed nights in a programme built around Brazilian culture and freedom of expression. I was invited to develop its visual identity from scratch — from the logotype to a graphic system that had to exist in two dimensions at once, the physical and the digital. Inspired by a night in the forest, the aesthetic plunges into a world of organic shapes and vibrant colour. At its centre is the jaguar: playful, fierce and irreverent, created to be the face of the venue and to invite people to throw themselves into this jungle of freedom. She came to life in a large-scale painting across the floor of the space, alongside graphics applied to the walls. The result is an identity that inhabits the venue physically and travels with it beyond the door.",
      pt: "A Selva é um espaço multicultural no coração de Vitória (ES), que reúne shows, festivais e festas temáticas em uma programação voltada à cultura brasileira e à liberdade de expressão. Fui convidada a desenvolver sua identidade visual do zero, do logotipo a um sistema gráfico que precisava existir em duas dimensões: a física e a digital. Inspirada em uma noite na floresta, a estética mergulha em um universo de formas orgânicas e cores vibrantes. No centro dela está a onça: divertida, feroz e irreverente, criada para ser o rosto da casa e convidar o público a se jogar nessa selva de liberdade. Ela ganhou vida em uma pintura de grande escala no chão do espaço, ao lado de grafismos aplicados nas paredes. O resultado é uma identidade que habita a casa fisicamente e a acompanha para fora dela.",
    },
    context: {
      en: "As art director, designer and illustrator on this project, I was responsible for conceiving the identity and the illustrations that built the venue's visual world.",
      pt: "Como diretora de arte, designer e ilustradora deste projeto, fui responsável pela concepção da identidade e das ilustrações que construíram o universo visual da casa.",
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
      en: "Illustration on the human–machine bond.",
      pt: "Ilustração sobre a relação humano–máquina.",
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
    // No satellite composition built for the index stage yet, so it sits out
    // the index while still appearing in the Show-all sheet and footer list.
    hiddenFromIndex: true,
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
      en: "Xou da Xoxa is a self-initiated project made as the final work for the Illustration Direction and Production course at Aprender Design. The brief was to take an existing album and reinterpret it in a language of my own. I chose Xou da Xuxa (1986) and turned it into an acid parody: a comic, darker retelling drawing on the urban legends and conspiracy theories that always surrounded the original — subliminal messages, demonic pacts, and the “X” as an occult symbol. Out of that imagery comes the “Pop Star from Hell”: an androgynous, demonic figure inspired by Xuxa's eighties aesthetic, at once nostalgic and unsettling. It is built entirely from illustration in mixed media: flat-colour vector art with black outlines, digital collage, and a molten, metallic 3D lettering. Flames, halftone textures and a warm palette complete the world, applied across cover, vinyl and t-shirt.",
      pt: "Xou da Xoxa é um projeto autoral desenvolvido como trabalho final do curso Direção e Produção de Ilustrações, da Aprender Design. A premissa foi partir de um álbum existente e reinterpretá-lo através de uma linguagem própria. Escolhi o Xou da Xuxa (1986) e o transformei em uma paródia ácida: uma releitura cômica e sombria que bebe nas lendas urbanas e teorias conspiratórias que sempre cercaram a obra original, como mensagens subliminares, pactos demoníacos e o “X” como símbolo ocultista. Desse imaginário nasce a “Pop Star do Inferno”: uma figura andrógina e demoníaca, inspirada na estética oitentista da Xuxa, que provoca nostalgia e estranhamento ao mesmo tempo. A construção é toda ilustrada, em técnica mista: ilustração vetorial de cores chapadas e contorno preto, colagem digital e um lettering 3D metálico e derretido. Chamas, texturas de retícula e uma paleta quente completam o universo, aplicado em capa, vinil e camiseta.",
    },
    context: {
      en: "As art director and illustrator, I signed the whole project end to end, from research and concept rationale to the final illustration.",
      pt: "Como diretora de arte e ilustradora, assinei o projeto integralmente, da pesquisa e defesa conceitual à ilustração final.",
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
 * The projects the index page's parallax stage and timeline cycle through —
 * `visibleProjects` minus anything flagged `hiddenFromIndex`. The Show-all
 * sheet and the case-study footer keep using `visibleProjects`, so a project
 * can be listed everywhere else while sitting out the index stage.
 */
export const indexProjects: Project[] = visibleProjects.filter(
  (p) => !p.hiddenFromIndex
);

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
    const next = s.kind === "hero" ? [s.src] : s.images;
    // Some case-study slots are video. Every consumer of this list renders an
    // <img> (index hero, satellites, show-all thumbnails), so an .mp4 here
    // would surface as a broken image. Animated GIFs are fine in an <img>.
    urls.push(...next.filter((u) => !/\.mp4$/i.test(u)));
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
