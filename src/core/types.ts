// Shared vocabulary for the whole system. SQLite stores these as strings;
// these unions + zod schemas are the source of truth.
import { z } from "zod";

export const PIPELINE_STAGES = [
  "NEW",                 // imported, nothing done yet
  "CONCEPTS_QUEUED",     // concept generation requested
  "CONCEPTS_IN_REVIEW",  // concepts generated, waiting for Eric to approve
  "READY_TO_INVITE",     // concepts approved, invite email drafted
  "INVITED",             // invite sent, portal link live
  "REVIEWING",           // client has viewed portal / left feedback
  "FAVORITE_SELECTED",   // client picked a concept
  "CHECKOUT_STARTED",    // checkout session created
  "PAID",                // payment confirmed
  "FULFILLING",          // packaging template or deploying site
  "DELIVERED",           // done
  "ON_HOLD",
  "LOST",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const INTAKE_SOURCES = ["manual", "quickbooks_csv", "quickbooks_api", "discord_sheet"] as const;
export type IntakeSourceId = (typeof INTAKE_SOURCES)[number];

export const SECTION_KINDS = [
  "HERO", "SERVICES", "ABOUT", "TEAM", "RESULTS", "TESTIMONIALS", "GALLERY", "PRICING", "FAQ", "CONTACT", "FOOTER", "CUSTOM",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const CONCEPT_STATUSES = ["DRAFT", "APPROVED", "REJECTED", "ARCHIVED"] as const;
export type ConceptStatus = (typeof CONCEPT_STATUSES)[number];

export const MESSAGE_KINDS = ["PORTAL_INVITE", "REMINDER", "FOLLOW_UP", "RECEIPT", "DELIVERY"] as const;
export type MessageKind = (typeof MESSAGE_KINDS)[number];

export const MESSAGE_STATUSES = ["PENDING_APPROVAL", "APPROVED", "SENT", "FAILED", "REJECTED"] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export const OFFER_KINDS = ["TEMPLATE_DOWNLOAD", "HOSTED_SITE"] as const;
export type OfferKind = (typeof OFFER_KINDS)[number];

export const ORDER_STATUSES = ["PENDING", "PAID", "FULFILLING", "FULFILLED", "CANCELED", "REFUNDED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DEPLOYMENT_STATUSES = ["PROVISIONING", "LIVE", "FAILED", "SUSPENDED"] as const;
export type DeploymentStatus = (typeof DEPLOYMENT_STATUSES)[number];

export const JOB_STATUSES = ["QUEUED", "RUNNING", "DONE", "FAILED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** A client as produced by any intake source, before it is merged into the DB. */
export const IntakeRecordSchema = z.object({
  externalId: z.string().min(1),
  businessName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  notes: z.string().optional(),
  raw: z.record(z.unknown()).optional(),
});
export type IntakeRecord = z.infer<typeof IntakeRecordSchema>;

export const FeedbackInputSchema = z.object({
  conceptId: z.string(),
  sectionId: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(4000).optional(),
});
export type FeedbackInput = z.infer<typeof FeedbackInputSchema>;
