import { notFound } from "next/navigation";
import { db } from "@/core/db";
import { SectionPreview } from "../../../components/SectionPreview";

export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await db.concept.findUnique({ where: { id }, include: { sections: { orderBy: { position: "asc" } } } });
  if (!c) notFound();
  return (
    <>
      <h1>{c.name}</h1>
      <p className="muted">{c.styleDirection}</p>
      {c.sections.map((s) => <SectionPreview key={s.id} kind={s.kind} title={s.title} content={s.content} palette={c.palette as any} />)}
    </>
  );
}
