/**
 * Agent-to-Agent Trust Example
 *
 * Demonstrates a real-world scenario where two agents from different
 * owners establish trust using the Credat handshake protocol:
 *
 *   - Alice owns a personal assistant agent
 *   - Bob owns an airline booking service agent
 *   - Bob's agent challenges Alice's agent to prove its identity
 *   - Alice's agent presents its delegation credential
 *   - Bob's agent verifies the trust chain and checks scopes
 *
 * Run with: npx tsx examples/agent-to-agent/index.ts
 */

import {
	createAgent,
	createChallenge,
	createDidWeb,
	delegate,
	generateKeyPair,
	getAllScopes,
	hasScope,
	presentCredentials,
	verifyPresentation,
} from "../../src/index";

async function main() {
	// ── Setup: Alice (traveler) ──
	console.log("=== Setup: Alice's identity & agent ===\n");

	const aliceKeyPair = generateKeyPair("ES256");
	const aliceDid = createDidWeb("alice.example.com");

	const aliceAgent = await createAgent({
		domain: "agents.alice.example.com",
		path: "assistant",
		algorithm: "ES256",
	});

	console.log("Alice DID:", aliceDid);
	console.log("Alice's agent DID:", aliceAgent.did);

	// Alice delegates travel-booking scopes to her agent
	const aliceDelegation = await delegate({
		agent: aliceAgent.did,
		owner: aliceDid,
		ownerKeyPair: {
			algorithm: aliceKeyPair.algorithm,
			publicKey: aliceKeyPair.publicKey,
			privateKey: aliceKeyPair.privateKey,
		},
		scopes: ["travel:book", "travel:search", "payment:authorize"],
		constraints: {
			maxTransactionValue: 5000,
			allowedDomains: ["airline.example.com", "hotels.example.com"],
		},
		validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
	});

	console.log("Alice delegation scopes:", aliceDelegation.claims.scopes);
	console.log();

	// ── Setup: Bob (airline service) ──
	console.log("=== Setup: Bob's identity & agent ===\n");

	const bobKeyPair = generateKeyPair("ES256");
	const bobDid = createDidWeb("airline.example.com");

	const bobAgent = await createAgent({
		domain: "airline.example.com",
		path: "booking-service",
		algorithm: "ES256",
	});

	console.log("Bob DID:", bobDid);
	console.log("Bob's agent DID:", bobAgent.did);

	// Bob delegates service scopes to his agent
	const bobDelegation = await delegate({
		agent: bobAgent.did,
		owner: bobDid,
		ownerKeyPair: {
			algorithm: bobKeyPair.algorithm,
			publicKey: bobKeyPair.publicKey,
			privateKey: bobKeyPair.privateKey,
		},
		scopes: ["flights:offer", "flights:confirm", "receipts:issue"],
	});

	console.log("Bob delegation scopes:", bobDelegation.claims.scopes);
	console.log();

	// ── Handshake: Bob's agent challenges Alice's agent ──
	console.log("=== Handshake: Challenge ===\n");

	const challenge = createChallenge({ from: bobAgent.did });

	console.log("Challenge from:", challenge.from);
	console.log("Challenge nonce:", challenge.nonce.slice(0, 20) + "...");
	console.log("Challenge timestamp:", challenge.timestamp);
	console.log();

	// ── Handshake: Alice's agent presents credentials ──
	console.log("=== Handshake: Presentation ===\n");

	const presentation = await presentCredentials({
		challenge,
		delegation: aliceDelegation.raw,
		agent: aliceAgent,
	});

	console.log("Presentation from:", presentation.from);
	console.log("Presentation type:", presentation.type);
	console.log("Nonce matches challenge:", presentation.nonce === challenge.nonce);
	console.log();

	// ── Handshake: Bob's agent verifies Alice's presentation ──
	console.log("=== Handshake: Verification ===\n");

	const result = await verifyPresentation(presentation, {
		challenge,
		ownerPublicKey: aliceKeyPair.publicKey,
		agentPublicKey: aliceAgent.keyPair.publicKey,
		agentAlgorithm: aliceAgent.keyPair.algorithm as "ES256" | "EdDSA",
	});

	console.log("Verification valid:", result.valid);
	console.log("Verified agent DID:", result.agent);
	console.log("Verified owner DID:", result.owner);
	console.log("All scopes:", getAllScopes(result));
	console.log("Constraints:", JSON.stringify(result.constraints, null, 2));
	console.log();

	// ── Trust decision: Does Alice's agent have the right scopes? ──
	console.log("=== Trust Decision ===\n");

	const canBook = hasScope(result, "travel:book");
	const canPay = hasScope(result, "payment:authorize");
	const canAdmin = hasScope(result, "admin:full");

	console.log("Can book travel:", canBook);
	console.log("Can authorize payment:", canPay);
	console.log("Has admin access:", canAdmin);

	if (result.valid && canBook && canPay) {
		console.log("\nBob's agent trusts Alice's agent to book and pay for flights.");
		if (result.constraints?.maxTransactionValue) {
			console.log(
				`Transaction limit: $${result.constraints.maxTransactionValue}`,
			);
		}
		if (result.constraints?.allowedDomains) {
			console.log("Allowed domains:", result.constraints.allowedDomains);
		}
	} else {
		console.log("\nTrust verification failed or insufficient scopes.");
	}

	console.log("\nDone.");
}

main().catch(console.error);
