import { DeeplinkRequestSchema, type DeeplinkResponse } from "../schemas/types.js";
import { buildDeeplink } from "../deeplink/builder.js";

export function buildLiligoDeeplink(params: Record<string, unknown>): DeeplinkResponse {
  const parsed = DeeplinkRequestSchema.safeParse(params);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    return { url: "", valid: false, warnings: issues };
  }
  return buildDeeplink(parsed.data);
}
