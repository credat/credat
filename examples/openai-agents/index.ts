/**
 * OpenAI Agents SDK + Credat Example
 *
 * Shows how an OpenAI-powered agent uses Credat for trust when
 * calling external services. The scenario:
 *
 *   1. An owner creates an agent identity and delegates scopes
 *   2. The agent's tool calls hit an external service
 *   3. The service challenges the agent (Credat handshake)
 *   4. The agent presents its delegation credential
 *   5. The service verifies identity + scopes before responding
 *
 * This is transport-agnostic — the same pattern works whether
 * the agent communicates via HTTP, WebSocket, or MCP.
 *
 * Run with: npx tsx examples/openai-agents/index.ts
 */

import {
	createAgent,
	createChallenge,
	createDidWeb,
	delegate,
	generateKeyPair,
	getAllScopes,
	hasAllScopes,
	presentCredentials,
	verifyPresentation,
} from "../../src/index";
import type {
	AgentIdentity,
	ChallengeMessage,
	DelegationCredential,
	DelegationResult,
} from "../../src/index";

// ══════════════════════════════════════════════
// Simulated External Service (e.g., a file API)
// ══════════════════════════════════════════════

const serviceKeyPair = generateKeyPair("ES256");
const serviceDid = createDidWeb("files.api.example.com");

/** The service issues a challenge to any connecting agent. */
function serviceIssueChallenge(): ChallengeMessage {
	return createChallenge({ from: serviceDid });
}

/** The service verifies the agent's presentation, then serves the request. */
async function serviceHandleRequest(
	presentation: Awaited<ReturnType<typeof presentCredentials>>,
	challenge: ChallengeMessage,
	agentPublicKey: Uint8Array,
	ownerPublicKey: Uint8Array,
	agentAlgorithm: "ES256" | "EdDSA",
	action: string,
	requiredScopes: string[],
): Promise<{ success: boolean; data?: string; error?: string }> {
	const result = await verifyPresentation(presentation, {
		challenge,
		ownerPublicKey,
		agentPublicKey,
		agentAlgorithm,
	});

	if (!result.valid) {
		return { success: false, error: "Identity verification failed" };
	}

	if (!hasAllScopes(result, requiredScopes)) {
		const granted = getAllScopes(result);
		return {
			success: false,
			error: `Insufficient scopes: need [${requiredScopes}], have [${granted}]`,
		};
	}

	// Scopes verified — execute the action
	return { success: true, data: `[${action}] executed for agent ${result.agent}` };
}

// ══════════════════════════════════════════════
// Simulated OpenAI Agent Tool Functions
//
// In a real OpenAI Agents SDK setup, these would be
// registered as tools via the Agents SDK. The agent
// calls them during execution, and each tool performs
// the Credat handshake before hitting the external API.
// ══════════════════════════════════════════════

async function toolReadFiles(
	agent: AgentIdentity,
	delegation: DelegationCredential,
	ownerPublicKey: Uint8Array,
): Promise<string> {
	// Step 1: Service challenges the agent
	const challenge = serviceIssueChallenge();

	// Step 2: Agent presents its credentials
	const presentation = await presentCredentials({
		challenge,
		delegation: delegation.token,
		agent,
	});

	// Step 3: Service verifies and responds
	const response = await serviceHandleRequest(
		presentation,
		challenge,
		agent.keyPair.publicKey,
		ownerPublicKey,
		agent.keyPair.algorithm,
		"files:read",
		["files:read"],
	);

	if (!response.success) return `Error: ${response.error}`;
	return response.data ?? "No data";
}

async function toolExecuteCode(
	agent: AgentIdentity,
	delegation: DelegationCredential,
	ownerPublicKey: Uint8Array,
): Promise<string> {
	const challenge = serviceIssueChallenge();

	const presentation = await presentCredentials({
		challenge,
		delegation: delegation.token,
		agent,
	});

	const response = await serviceHandleRequest(
		presentation,
		challenge,
		agent.keyPair.publicKey,
		ownerPublicKey,
		agent.keyPair.algorithm,
		"tools:execute",
		["tools:execute"],
	);

	if (!response.success) return `Error: ${response.error}`;
	return response.data ?? "No data";
}

async function toolDeleteFiles(
	agent: AgentIdentity,
	delegation: DelegationCredential,
	ownerPublicKey: Uint8Array,
): Promise<string> {
	const challenge = serviceIssueChallenge();

	const presentation = await presentCredentials({
		challenge,
		delegation: delegation.token,
		agent,
	});

	const response = await serviceHandleRequest(
		presentation,
		challenge,
		agent.keyPair.publicKey,
		ownerPublicKey,
		agent.keyPair.algorithm,
		"files:delete",
		["files:delete"],
	);

	if (!response.success) return `Error: ${response.error}`;
	return response.data ?? "No data";
}

// ══════════════════════════════════════════════
// Main: Simulate an OpenAI agent pipeline
// ══════════════════════════════════════════════

async function main() {
	console.log("=== Setup: Owner & Agent Identity ===\n");

	// Owner creates a key pair (this represents the human/org)
	const ownerKeyPair = generateKeyPair("ES256");
	const ownerDid = createDidWeb("acme.example.com");
	console.log("Owner DID:", ownerDid);

	// Create the agent identity (this would be the OpenAI agent)
	const agent = await createAgent({
		domain: "agents.acme.example.com",
		path: "openai/assistant-v1",
		algorithm: "ES256",
	});
	console.log("Agent DID:", agent.did);

	// Delegate specific scopes — the agent can read files and execute tools,
	// but NOT delete files
	const delegation = await delegate({
		agent: agent.did,
		owner: ownerDid,
		ownerKeyPair,
		scopes: ["tools:execute", "files:read"],
		constraints: {
			allowedDomains: ["files.api.example.com"],
			rateLimit: 100,
		},
		validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
	});

	console.log("Delegated scopes:", delegation.claims.scopes);
	console.log("Valid until:", delegation.claims.validUntil);
	console.log();

	// ── Simulate the agent executing tools during a conversation ──

	console.log("=== Agent Tool Calls (simulating OpenAI agent pipeline) ===\n");

	// Tool call 1: Read files — ALLOWED (agent has files:read)
	console.log("Tool: read-files");
	const r1 = await toolReadFiles(agent, delegation, ownerKeyPair.publicKey);
	console.log("Result:", r1);
	console.log();

	// Tool call 2: Execute code — ALLOWED (agent has tools:execute)
	console.log("Tool: execute-code");
	const r2 = await toolExecuteCode(agent, delegation, ownerKeyPair.publicKey);
	console.log("Result:", r2);
	console.log();

	// Tool call 3: Delete files — DENIED (agent does NOT have files:delete)
	console.log("Tool: delete-files");
	const r3 = await toolDeleteFiles(agent, delegation, ownerKeyPair.publicKey);
	console.log("Result:", r3);
	console.log();

	// ── Summary ──

	console.log("=== Summary ===\n");
	console.log("The agent successfully authenticated for granted scopes");
	console.log("(tools:execute, files:read) but was denied for files:delete.");
	console.log("Each tool call performed a full Credat handshake, proving the");
	console.log("agent's identity and delegated permissions to the service.");
	console.log("\nDone.");
}

main().catch(console.error);
