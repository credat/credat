import { describe, it, expect } from "vitest";
import { hasScope, hasAnyScope, hasAllScopes, getAllScopes } from "./helpers";

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
});

describe("hasAllScopes", () => {
	it("returns true when all scopes present", () => {
		expect(hasAllScopes(mockResult, ["book:travel", "read:email"])).toBe(true);
	});

	it("returns false when some scopes missing", () => {
		expect(hasAllScopes(mockResult, ["book:travel", "admin:all"])).toBe(false);
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
});
