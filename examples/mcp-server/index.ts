/**
 * MCP Server Authentication Example
 *
 * Demonstrates how an MCP server uses Credat to verify agent identity
 * before executing tools. The flow:
 *
 *   1. Owner creates an agent and delegates scoped permissions
 *   2. MCP server issues a challenge when the agent connects
 *   3. Agent signs the challenge with its key + delegation credential
 *   4. Server verifies the presentation and checks scopes
 *   5. Server grants or denies access to protected tools
 *
 * This shows the raw SDK primitives. For production MCP servers,
 * use @credat/mcp which wraps this into CredatAuth.install(server).
 *
 * Run with: npx tsx examples/mcp-server/index.ts
 */

import {
	createAgent,
	createChallenge,
	createDidWeb,
	delegate,
	generateKeyPair,
	getAllScopes,
	hasAllScopes,
	hasScope,
	presentCredentials,
	validateConstraints,
	verifyPresentation,
} from "../../src/index";
import type { DelegationResult } from "../../src/index";

// ── Simulate an MCP tool registry ──

interface ToolDefinition {
	name: string;
	description: string;
	requiredScopes: string[];
	handler: (args: Record<string, unknown>, agent: DelegationResult) => string;
}

const tools: ToolDefinition[] = [
	{
		name: "read-emails",
		description: "Read the user's recent emails",
		requiredScopes: ["email:read"],
		handler: (_args, agent) =>
			`[${agent.agent}] Reading emails... Found 3 unread messages.`,
	},
	{
		name: "send-email",
		description: "Send an email on behalf of the user",
		requiredScopes: ["email:send"],
		handler: (args, agent) =>
			`[${agent.agent}] Sent email to ${args.to ?? "unknown"}.`,
	},
	{
		name: "delete-account",
		description: "Permanently delete the user's account",
		requiredScopes: ["admin:delete"],
		handler: (_args, agent) =>
			`[${agent.agent}] Account deleted.`,
	},
];

function executeTool(
	toolName: string,
	args: Record<string, unknown>,
	verifiedAgent: DelegationResult,
): string {
	const tool = tools.find((t) => t.name === toolName);
	if (!tool) return `Error: Unknown tool "${toolName}"`;

	if (!verifiedAgent.valid) return "Error: Agent not authenticated";

	// Check scopes
	if (!hasAllScopes(verifiedAgent, tool.requiredScopes)) {
		const granted = getAllScopes(verifiedAgent);
		return `Access denied: "${toolName}" requires [${tool.requiredScopes}] but agent has [${granted}]`;
	}

	// Check constraints (e.g., domain restrictions)
	if (verifiedAgent.constraints) {
		const violations = validateConstraints(
			verifiedAgent.constraints,
			args,
		);
		if (violations.length > 0) {
			return `Constraint violation: ${violations.map((v) => v.message).join(", ")}`;
		}
	}

	return tool.handler(args, verifiedAgent);
}

async function main() {
	// ══════════════════════════════════════════════
	// SETUP: Owner creates an agent with permissions
	// ══════════════════════════════════════════════

	console.log("=== Setup: Owner & Agent ===\n");

	const ownerKeyPair = generateKeyPair("ES256");
	const ownerDid = createDidWeb("company.example.com");

	const agent = await createAgent({
		domain: "agents.company.example.com",
		path: "assistant",
		algorithm: "ES256",
	});

	const delegation = await delegate({
		agent: agent.did,
		owner: ownerDid,
		ownerKeyPair,
		scopes: ["email:read", "email:send", "calendar:read"],
		constraints: {
			allowedDomains: ["company.example.com", "partner.example.com"],
			rateLimit: 50,
		},
		validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
	});

	console.log("Owner DID:", ownerDid);
	console.log("Agent DID:", agent.did);
	console.log("Delegated scopes:", delegation.claims.scopes);
	console.log();

	// ══════════════════════════════════════════════
	// MCP SERVER: Agent connects, server challenges
	// ══════════════════════════════════════════════

	console.log("=== MCP Server: Issue Challenge ===\n");

	const serverDid = createDidWeb("mcp.company.example.com");
	const challenge = createChallenge({ from: serverDid });

	console.log("Server DID:", serverDid);
	console.log("Challenge nonce:", challenge.nonce.slice(0, 24) + "...");
	console.log("Challenge timestamp:", challenge.timestamp);
	console.log();

	// ══════════════════════════════════════════════
	// MCP CLIENT: Agent signs and presents credentials
	// ══════════════════════════════════════════════

	console.log("=== MCP Client: Present Credentials ===\n");

	const presentation = await presentCredentials({
		challenge,
		delegation: delegation.token,
		agent,
	});

	console.log("Presentation from:", presentation.from);
	console.log("Presentation type:", presentation.type);
	console.log();

	// ══════════════════════════════════════════════
	// MCP SERVER: Verify and establish session
	// ══════════════════════════════════════════════

	console.log("=== MCP Server: Verify Presentation ===\n");

	const verified = await verifyPresentation(presentation, {
		challenge,
		ownerPublicKey: ownerKeyPair.publicKey,
		agentPublicKey: agent.keyPair.publicKey,
		agentAlgorithm: agent.keyPair.algorithm,
	});

	console.log("Verified:", verified.valid);
	if (verified.valid) {
		console.log("Agent:", verified.agent);
		console.log("Owner:", verified.owner);
		console.log("Scopes:", verified.scopes);
		console.log("Constraints:", JSON.stringify(verified.constraints));
	}
	console.log();

	// ══════════════════════════════════════════════
	// MCP SERVER: Execute tools with scope enforcement
	// ══════════════════════════════════════════════

	console.log("=== Tool Execution ===\n");

	// Allowed: agent has email:read
	const r1 = executeTool("read-emails", {}, verified);
	console.log("read-emails:", r1);

	// Allowed: agent has email:send
	const r2 = executeTool(
		"send-email",
		{ to: "bob@partner.example.com", domain: "partner.example.com" },
		verified,
	);
	console.log("send-email:", r2);

	// Denied: agent does NOT have admin:delete
	const r3 = executeTool("delete-account", {}, verified);
	console.log("delete-account:", r3);

	// Constraint violation: domain not in allowedDomains
	const r4 = executeTool(
		"send-email",
		{ to: "eve@evil.com", domain: "evil.com" },
		verified,
	);
	console.log("send-email (bad domain):", r4);

	console.log();

	// ══════════════════════════════════════════════
	// SCOPE SUMMARY
	// ══════════════════════════════════════════════

	console.log("=== Scope Summary ===\n");
	console.log("email:read     ->", hasScope(verified, "email:read"));
	console.log("email:send     ->", hasScope(verified, "email:send"));
	console.log("calendar:read  ->", hasScope(verified, "calendar:read"));
	console.log("admin:delete   ->", hasScope(verified, "admin:delete"));

	console.log("\nDone.");
}

main().catch(console.error);
