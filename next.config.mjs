/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ["@prisma/client", "exceljs"],
  // Files read at runtime with fs: bundled case studies and committed theme screenshots.
  outputFileTracingIncludes: {
    "/admin/**": ["./case-studies/*/client.json", "./case-studies/*/profile.json", "./case-studies/*/snapshot/**"],
    "/p/**": ["./previews/**"],
  },
};
