// What we learned about a client's business from their current site, in a
// shape the concept generator can write real copy from (instead of
// "[Replace with real story]" placeholders). Stored on Client.profile.
import { z } from "zod";

const Link = z.object({ label: z.string(), href: z.string() });

export const ClientProfileSchema = z.object({
  legalName: z.string(),
  shortName: z.string(),
  tagline: z.string().optional(),
  industry: z.string(),
  summary: z.string(),
  phone: z.string(),
  fax: z.string().optional(),
  email: z.string().optional(),
  address: z.object({ street: z.string(), city: z.string(), state: z.string(), zip: z.string(), note: z.string().optional(), mapsQuery: z.string().optional() }),
  serviceArea: z.string().optional(),
  languages: z.array(z.string()).default([]),
  about: z.array(z.string()).min(1),
  stats: z.array(z.object({ value: z.string(), label: z.string() })).default([]),
  serviceGroups: z.array(z.object({
    audience: z.string(),
    groups: z.array(z.object({ name: z.string(), blurb: z.string().optional(), covers: z.array(z.string()).default([]) })),
  })).min(1),
  team: z.array(z.object({ name: z.string(), role: z.string() })).default([]),
  testimonials: z.array(z.object({ quote: z.string(), author: z.string() })).default([]),
  results: z.array(z.object({ title: z.string(), detail: z.string().optional() })).default([]),
  payments: z.object({ label: z.string(), url: z.string(), note: z.string().optional() }).optional(),
  social: z.array(Link).default([]),
  disclaimer: z.string().optional(),
  /** Things the client should confirm before launch (conflicting facts found during research). */
  toConfirm: z.array(z.string()).default([]),
});
export type ClientProfile = z.infer<typeof ClientProfileSchema>;

export function parseProfile(v: unknown): ClientProfile | null {
  if (v == null) return null;
  const r = ClientProfileSchema.safeParse(v);
  return r.success ? r.data : null;
}
