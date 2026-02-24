import { AgentError, ErrorCodes } from "../errors";
import type { StorageAdapter } from "../storage/types";
import type { AgentIdentity } from "../types";

export interface LoadAgentOptions {
	did: string;
	storage: StorageAdapter;
}

export async function loadAgent(
	options: LoadAgentOptions,
): Promise<AgentIdentity> {
	const { did, storage } = options;

	const stored = await storage.get<AgentIdentity>("agents", did);

	if (!stored) {
		throw new AgentError(ErrorCodes.AGENT_NOT_FOUND, `Agent not found: ${did}`);
	}

	return stored;
}
