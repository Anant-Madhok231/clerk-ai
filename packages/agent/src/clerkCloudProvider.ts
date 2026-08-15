import type { Extraction } from "./schema.js";
import type { AIProvider, ExtractionRequest } from "./provider.js";

/**
 * Placeholder for a future hosted Clerk service. The provider boundary
 * (AIProvider) is the only thing that needs to exist today; this class is
 * intentionally unimplemented until that service exists, rather than being
 * a half-built feature no one asked for in V1.
 */
export class ClerkCloudProvider implements AIProvider {
  readonly name = "clerk-cloud";

  async extract(_request: ExtractionRequest): Promise<Extraction> {
    throw new Error(
      "Clerk Cloud is not available yet. Use Demo Mode or bring your own OpenAI API key in Settings > AI."
    );
  }
}
