import type { StatusListData } from "../types";
import type { StorageAdapter } from "./types";

const STATUS_LIST_COLLECTION = "statusLists";

interface SerializedStatusListData {
	bitstring: number[];
	issuer: string;
	id: string;
	size: number;
}

export async function saveStatusList(
	storage: StorageAdapter,
	list: StatusListData,
): Promise<void> {
	const serialized: SerializedStatusListData = {
		bitstring: Array.from(list.bitstring),
		issuer: list.issuer,
		id: list.id,
		size: list.size,
	};
	await storage.set(STATUS_LIST_COLLECTION, list.id, serialized);
}

export async function loadStatusList(
	storage: StorageAdapter,
	id: string,
): Promise<StatusListData | null> {
	const data = await storage.get<SerializedStatusListData>(
		STATUS_LIST_COLLECTION,
		id,
	);

	if (!data) return null;

	return {
		bitstring: new Uint8Array(data.bitstring),
		issuer: data.issuer,
		id: data.id,
		size: data.size,
	};
}

export async function deleteStatusList(
	storage: StorageAdapter,
	id: string,
): Promise<boolean> {
	return storage.delete(STATUS_LIST_COLLECTION, id);
}

export async function listStatusLists(
	storage: StorageAdapter,
): Promise<StatusListData[]> {
	const items = await storage.list<SerializedStatusListData>(
		STATUS_LIST_COLLECTION,
	);

	return items.map((item) => ({
		bitstring: new Uint8Array(item.value.bitstring),
		issuer: item.value.issuer,
		id: item.value.id,
		size: item.value.size,
	}));
}
