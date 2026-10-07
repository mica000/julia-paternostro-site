/*
  /work/[slug] — case study route
  --------------------------------
  Server component wrapper. Its only jobs are:
    - resolve the URL slug against the projects data,
    - short-circuit to 404 if the slug is unknown OR flagged `hidden`,
    - hand the record to <CaseStudy> (a Client Component) for rendering.

  `generateStaticParams` prerenders every project's case study at build
  time — the projects list is a fixed, code-defined array so there's no
  reason to render these dynamically.

  Next.js 16 note: `params` is a Promise. Await it before destructuring.
*/

import { notFound } from "next/navigation";
import CaseStudy from "@/components/CaseStudy";
import { getProject, visibleProjects } from "@/lib/projects";

// Only the visible projects get a page. A `hidden` project used to keep a
// working URL — handy while the site was private, but the repo is public
// now, so its slug is there for anyone to read and the page was one guess
// away. Unfinished and client work stays off the site until it's ready.
export function generateStaticParams() {
  return visibleProjects.map((p) => ({ slug: p.slug }));
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project || project.hidden) notFound();
  return <CaseStudy project={project} />;
}
