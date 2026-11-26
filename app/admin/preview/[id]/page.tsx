import { notFound, redirect } from "next/navigation";
import { db } from "@/core/db";
import { themeSlug } from "@/integrations/templates/wp/theme";
import { findSiteDir } from "@/research/previews";
import { SectionPreview } from "../../../components/SectionPreview";

// Concepts with a full website export open that; ?sections=1 shows the older section mockup.
export default async function Preview({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sections?: string }> }) {
  const { id } = await params;
  const { sections } = await searchParams;
  const c = await db.concept.findUnique({ where: { id }, include: { client: true, sections: { orderBy: { position: "asc" } } } });
  if (!c) notFound();
  if (sections !== "1" && findSiteDir(themeSlug(c))) redirect(`/admin/site/${c.id}/`);
  return (
    <>
      <h1>{c.name}</h1>
      <p className="muted">{c.styleDirection}</p>
      {c.sections.map((s) => <SectionPreview key={s.id} kind={s.kind} title={s.title} content={s.content} palette={c.palette as any} />)}
    </>
  );
}
