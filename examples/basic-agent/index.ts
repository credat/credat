/**
 * Basic Agent Example
 *
 * Demonstrates the core Credat flow:
 *   1. Owner creates an identity (key pair + DID)
 *   2. Owner creates an agent
 *   3. Owner delegates scoped permissions to the agent
 *   4. Anyone can verify the delegation
 *   5. Scope checks on the verified result
 *
 * Run with: npx tsx examples/basic-agent/index.ts
 */

import {
	createAgent,
	createDidWeb,
	delegate,
	generateKeyPair,
	hasAllScopes,
	hasAnyScope,
	hasScope,
	verifyDelegation,
} from "../../src/index";

async function main() {
	// ── Step 1: Owner identity ──
	console.log("=== Step 1: Create owner identity ===\n");

	const ownerKeyPair = generateKeyPair("ES256");
	const ownerDid = createDidWeb("example.com", "users/alice");

	console.log("Owner DID:", ownerDid);
	console.log("Owner algorithm:", ownerKeyPair.algorithm);
	console.log(
		"Owner public key length:",
		ownerKeyPair.publicKey.length,
		"bytes\n",
	);

	// ── Step 2: Create an agent ──
	console.log("=== Step 2: Create agent identity ===\n");

	const agent = await createAgent({
		domain: "agents.example.com",
		path: "alice/assistant",
		algorithm: "ES256",
	});

	console.log("Agent DID:", agent.did);
	console.log("Agent algorithm:", agent.keyPair.algorithm);
	console.log("Agent DID Document ID:", agent.didDocument.id, "\n");

	// ── Step 3: Delegate permissions ──
	console.log("=== Step 3: Delegate scoped permissions ===\n");

	const delegation = await delegate({
		agent: agent.did,
		owner: ownerDid,
		ownerKeyPair,
		scopes: ["email:read", "calendar:read", "calendar:write"],
		constraints: {
			maxTransactionValue: 1000,
			allowedDomains: ["example.com", "trusted-service.io"],
			rateLimit: 100,
		},
		validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
	});

	console.log("Delegation credential issued");
	console.log("Scopes:", delegation.claims.scopes);
	console.log(
		"Constraints:",
		JSON.stringify(delegation.claims.constraints, null, 2),
	);
	console.log("Valid until:", delegation.claims.validUntil);
	console.log("Token length:", delegation.token.length, "chars\n");

	// ── Step 4: Verify the delegation ──
	console.log("=== Step 4: Verify delegation ===\n");

	const result = await verifyDelegation(delegation.token, {
		ownerPublicKey: ownerKeyPair.publicKey,
	});

	console.log("Verification valid:", result.valid);

	if (result.valid) {
		console.log("Verified agent:", result.agent);
		console.log("Verified owner:", result.owner);
		console.log("Verified scopes:", result.scopes);
		console.log(
			"Verified constraints:",
			JSON.stringify(result.constraints, null, 2),
		);
		console.log();

		// ── Step 5: Check scopes ──
		console.log("=== Step 5: Scope checks ===\n");

		console.log('hasScope("email:read"):', hasScope(result, "email:read"));
		console.log('hasScope("email:write"):', hasScope(result, "email:write"));
		console.log(
			'hasAnyScope(["files:read", "calendar:write"]):',
			hasAnyScope(result, ["files:read", "calendar:write"]),
		);
		console.log(
			'hasAllScopes(["email:read", "calendar:read"]):',
			hasAllScopes(result, ["email:read", "calendar:read"]),
		);
		console.log(
			'hasAllScopes(["email:read", "files:delete"]):',
			hasAllScopes(result, ["email:read", "files:delete"]),
		);
	} else {
		console.log("Verification failed:", result.errors);
	}

	console.log("\nDone.");
}

main().catch(console.error);
