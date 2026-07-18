/*
  /work/[slug] — case study route
  --------------------------------
  Server component wrapper. Its only jobs are:
    - resolve the URL slug against the projects data,
    - short-circuit to 404 if the slug is unknown,
    - hand the record to <CaseStudy> (a Client Component) for rendering.

  `generateStaticParams` prerenders every project's case study at build
  time — the projects list is a fixed, code-defined array so there's no
  reason to render these dynamically.

  Next.js 16 note: `params` is a Promise. Await it before destructuring.
*/

import { notFound } from "next/navigation";
import CaseStudy from "@/components/CaseStudy";
import { getProject, projects } from "@/lib/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  return <CaseStudy project={project} />;
}
