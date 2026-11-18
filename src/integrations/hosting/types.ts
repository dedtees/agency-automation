export interface ProvisionRequest {
  orderId: string;
  businessName: string;
  desiredDomain?: string | null;
  themePackagePath: string;
  adminEmail: string;
}
export interface ProvisionResult {
  externalId: string;
  siteUrl: string;
  adminUrl: string;
  status: "PROVISIONING" | "LIVE";
}
/** Creates and manages a hosted WordPress site for HOSTED_SITE orders. */
export interface HostingProvider {
  id: string;
  provision(req: ProvisionRequest): Promise<ProvisionResult>;
  status(externalId: string): Promise<"PROVISIONING" | "LIVE" | "FAILED" | "SUSPENDED">;
  suspend(externalId: string): Promise<void>;
}
