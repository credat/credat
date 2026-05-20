import { describe, expect, it } from "vitest";
import {
	getAllScopes,
	hasAllScopes,
	hasAnyScope,
	hasScope,
	validateConstraints,
} from "./helpers";

const mockResult = {
	valid: true,
	agent: "did:web:agent.example.com",
	owner: "did:web:owner.example.com",
	scopes: ["book:travel", "read:email", "spend:usd"],
	errors: [],
};

describe("hasScope", () => {
	it("returns true when scope exists", () => {
		expect(hasScope(mockResult, "book:travel")).toBe(true);
	});

	it("returns false when scope missing", () => {
		expect(hasScope(mockResult, "delete:account")).toBe(false);
	});
});

describe("hasAnyScope", () => {
	it("returns true when at least one scope matches", () => {
		expect(hasAnyScope(mockResult, ["delete:account", "book:travel"])).toBe(
			true,
		);
	});

	it("returns false when no scope matches", () => {
		expect(hasAnyScope(mockResult, ["delete:account", "admin:all"])).toBe(
			false,
		);
	});

	it("returns false for empty scopes array", () => {
		expect(hasAnyScope(mockResult, [])).toBe(false);
	});
});

describe("hasAllScopes", () => {
	it("returns true when all scopes present", () => {
		expect(hasAllScopes(mockResult, ["book:travel", "read:email"])).toBe(true);
	});

	it("returns false when some scopes missing", () => {
		expect(hasAllScopes(mockResult, ["book:travel", "admin:all"])).toBe(false);
	});

	it("returns true for empty scopes array", () => {
		expect(hasAllScopes(mockResult, [])).toBe(true);
	});
});

describe("getAllScopes", () => {
	it("returns all scopes", () => {
		expect(getAllScopes(mockResult)).toEqual([
			"book:travel",
			"read:email",
			"spend:usd",
		]);
	});

	it("returns a copy, not a reference", () => {
		const scopes = getAllScopes(mockResult);
		scopes.push("admin:all");
		expect(mockResult.scopes).toHaveLength(3);
	});

	it("returns empty array for empty scopes", () => {
		expect(getAllScopes({ scopes: [] })).toEqual([]);
	});
});

// === Issue #11: Constraint Validation ===

describe("validateConstraints", () => {
	it("returns empty array for undefined constraints", () => {
		expect(validateConstraints(undefined, { transactionValue: 100 })).toEqual(
			[],
		);
	});

	it("returns empty array for empty constraints", () => {
		expect(validateConstraints({}, { transactionValue: 100 })).toEqual([]);
	});

	it("returns empty array when context has no matching fields", () => {
		expect(
			validateConstraints({ maxTransactionValue: 1000 }, { domain: "foo.com" }),
		).toEqual([]);
	});

	it("validates maxTransactionValue - within limit", () => {
		const violations = validateConstraints(
			{ maxTransactionValue: 1000 },
			{ transactionValue: 500 },
		);
		expect(violations).toEqual([]);
	});

	it("validates maxTransactionValue - exceeds limit", () => {
		const violations = validateConstraints(
			{ maxTransactionValue: 1000 },
			{ transactionValue: 5000 },
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.constraint).toBe("maxTransactionValue");
		expect(violations[0]?.message).toContain("5000");
		expect(violations[0]?.message).toContain("1000");
	});

	it("validates maxTransactionValue - exact limit is valid", () => {
		const violations = validateConstraints(
			{ maxTransactionValue: 1000 },
			{ transactionValue: 1000 },
		);
		expect(violations).toEqual([]);
	});

	it("validates allowedDomains - allowed domain", () => {
		const violations = validateConstraints(
			{ allowedDomains: ["airline.com", "hotel.com"] },
			{ domain: "airline.com" },
		);
		expect(violations).toEqual([]);
	});

	it("validates allowedDomains - disallowed domain", () => {
		const violations = validateConstraints(
			{ allowedDomains: ["airline.com", "hotel.com"] },
			{ domain: "unknown-vendor.com" },
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.constraint).toBe("allowedDomains");
		expect(violations[0]?.message).toContain("unknown-vendor.com");
	});

	it("validates rateLimit - within limit", () => {
		const violations = validateConstraints(
			{ rateLimit: 100 },
			{ rateLimit: 50 },
		);
		expect(violations).toEqual([]);
	});

	it("validates rateLimit - exceeds limit", () => {
		const violations = validateConstraints(
			{ rateLimit: 100 },
			{ rateLimit: 150 },
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.constraint).toBe("rateLimit");
	});

	it("validates multiple constraints at once", () => {
		const violations = validateConstraints(
			{
				maxTransactionValue: 1000,
				allowedDomains: ["airline.com"],
			},
			{
				transactionValue: 5000,
				domain: "unknown.com",
			},
		);
		expect(violations).toHaveLength(2);
		expect(violations.map((v) => v.constraint)).toContain(
			"maxTransactionValue",
		);
		expect(violations.map((v) => v.constraint)).toContain("allowedDomains");
	});

	it("ignores unknown constraint keys (forward-compatible)", () => {
		const violations = validateConstraints(
			{ futureConstraint: "some-value" } as Record<string, unknown>,
			{ transactionValue: 100 },
		);
		expect(violations).toEqual([]);
	});

	it("validates maxTransactionValue - zero value is within any positive limit", () => {
		expect(
			validateConstraints(
				{ maxTransactionValue: 1000 },
				{ transactionValue: 0 },
			),
		).toEqual([]);
	});

	it("validates maxTransactionValue - zero limit rejects positive value", () => {
		const violations = validateConstraints(
			{ maxTransactionValue: 0 },
			{ transactionValue: 1 },
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.constraint).toBe("maxTransactionValue");
	});

	it("validates maxTransactionValue - zero limit allows zero value", () => {
		expect(
			validateConstraints({ maxTransactionValue: 0 }, { transactionValue: 0 }),
		).toEqual([]);
	});

	it("validates maxTransactionValue - negative value is within limit", () => {
		expect(
			validateConstraints(
				{ maxTransactionValue: 1000 },
				{ transactionValue: -500 },
			),
		).toEqual([]);
	});

	it("skips maxTransactionValue when context.transactionValue is undefined", () => {
		expect(validateConstraints({ maxTransactionValue: 1000 }, {})).toEqual([]);
	});

	it("skips allowedDomains when context.domain is undefined", () => {
		expect(
			validateConstraints(
				{ allowedDomains: ["example.com"] },
				{ transactionValue: 100 },
			),
		).toEqual([]);
	});

	it("validates rateLimit - exact limit is valid", () => {
		expect(validateConstraints({ rateLimit: 100 }, { rateLimit: 100 })).toEqual(
			[],
		);
	});

	it("skips rateLimit when context.rateLimit is not a number", () => {
		expect(
			validateConstraints({ rateLimit: 100 }, {
				rateLimit: "fast",
			} as unknown as Record<string, unknown>),
		).toEqual([]);
	});

	it("skips rateLimit when context.rateLimit is undefined", () => {
		expect(validateConstraints({ rateLimit: 100 }, {})).toEqual([]);
	});

	it("validates allowedDomains - empty list rejects any domain", () => {
		const violations = validateConstraints(
			{ allowedDomains: [] },
			{ domain: "example.com" },
		);
		expect(violations).toHaveLength(1);
		expect(violations[0]?.constraint).toBe("allowedDomains");
	});
});
