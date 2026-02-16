export interface StorageAdapter {
	get<T>(collection: string, key: string): Promise<T | null>;
	set<T>(collection: string, key: string, value: T): Promise<void>;
	delete(collection: string, key: string): Promise<boolean>;
	list<T>(collection: string): Promise<Array<{ key: string; value: T }>>;
	clear(collection?: string): Promise<void>;
}
