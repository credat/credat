export interface HasScopes {
	scopes: string[];
}

export function hasScope(result: HasScopes, scope: string): boolean {
	return result.scopes.includes(scope);
}

export function hasAnyScope(result: HasScopes, scopes: string[]): boolean {
	return scopes.some((scope) => result.scopes.includes(scope));
}

export function hasAllScopes(result: HasScopes, scopes: string[]): boolean {
	return scopes.every((scope) => result.scopes.includes(scope));
}

export function getAllScopes(result: HasScopes): string[] {
	return [...result.scopes];
}
