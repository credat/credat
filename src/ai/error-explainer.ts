import type { AIConfig, VerificationError } from "../types";
import { callLLM } from "./llm";

const SYSTEM_PROMPT = `You are an expert in eIDAS 2.0 verifiable credentials helping developers debug credential verification errors.

Given a verification error, explain:
1. What went wrong in plain English
2. The most likely cause
3. How to fix it

Be concise (2-3 sentences max). Be specific and actionable.
Reference eIDAS 2.0 requirements where relevant.
Do NOT use markdown formatting. Plain text only.`;

export async function explainError(
	config: AIConfig,
	error: VerificationError,
): Promise<string> {
	const response = await callLLM(config, {
		systemPrompt: SYSTEM_PROMPT,
		userPrompt: `Error code: ${error.code}\nError message: ${error.message}${error.humanMessage ? `\nContext: ${error.humanMessage}` : ""}`,
	});

	return response.content.trim();
}
