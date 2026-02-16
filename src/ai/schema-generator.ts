import { CredatError, ErrorCodes } from "../errors";
import type { AIConfig, AIGeneratedSchema } from "../types";
import { callLLM } from "./llm";
import { extractJson } from "./utils";

const SYSTEM_PROMPT = `You are an expert in eIDAS 2.0 verifiable credentials and the EU Digital Identity Wallet (EUDIW) ecosystem.

Your task is to generate credential schemas based on natural language descriptions. You understand:
- SD-JWT VC (Selective Disclosure JWT Verifiable Credentials)
- ISO 18013-5 mDoc (Mobile Document)
- eIDAS 2.0 Implementing Acts and the Architecture Reference Framework (ARF)
- EUDIW PID (Person Identification Data) attributes
- Standard credential types: PID, mDL, diploma, KYC, age verification

IMPORTANT eIDAS 2.0 rules:
- PID attributes: family_name, given_name, birth_date, age_over_18, age_over_nn, nationality, resident_address, resident_city, resident_postal_code, resident_country, gender, birth_place, birth_city, birth_country, birth_state
- For high assurance (LoA High): assurance_level claim is required
- SD-JWT VC format is preferred for attestations, mDoc for identity documents
- Claims that could identify a person should be marked for selective disclosure
- Date fields should use ISO 8601 (YYYY-MM-DD)

Respond ONLY with a valid JSON object matching this structure:

{
  "type": "PascalCaseCredentialType",
  "description": "Human-readable description",
  "claims": {
    "claimName": {
      "type": "string | number | boolean | date | object",
      "required": true,
      "description": "What this claim represents",
      "selectiveDisclosure": false
    }
  },
  "format": "sd-jwt-vc or mdoc",
  "confidence": 0.95,
  "suggestions": ["Suggestion for improving the schema"],
  "eidasCompliance": {
    "compliant": true,
    "warnings": ["Any compliance warnings"],
    "missingClaims": ["Claims that should be added for compliance"]
  }
}

Do NOT include any text outside the JSON object. No markdown, no explanation.`;

export async function generateSchema(
	config: AIConfig,
	description: string,
): Promise<AIGeneratedSchema> {
	const response = await callLLM(config, {
		systemPrompt: SYSTEM_PROMPT,
		userPrompt: `Generate a credential schema for: "${description}"`,
		jsonMode: true,
	});

	const raw = JSON.parse(extractJson(response.content)) as Record<
		string,
		unknown
	>;

	// Validate required fields
	if (!raw.type || !raw.claims || !raw.format) {
		throw new CredatError(
			ErrorCodes.AI_PARSE_FAILED,
			"AI returned schema missing required fields (type, claims, format)",
		);
	}

	return raw as unknown as AIGeneratedSchema;
}
