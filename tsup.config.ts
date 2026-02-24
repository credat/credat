import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		format: ["esm", "cjs"],
		dts: true,
		splitting: true,
		treeshake: true,
		clean: true,
		sourcemap: true,
		external: ["better-sqlite3"],
	},
	{
		entry: ["src/storage/sqlite.ts"],
		outDir: "dist/storage",
		format: ["esm", "cjs"],
		dts: true,
		external: ["better-sqlite3"],
	},
]);
