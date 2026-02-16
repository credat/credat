import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/storage/sqlite.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  clean: true,
  sourcemap: true,
  minify: false,
  external: ['better-sqlite3'],
})
