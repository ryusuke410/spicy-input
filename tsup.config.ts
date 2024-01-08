import { defineConfig } from "tsup";

const config = defineConfig((options) => ({
  entry: ['src/index.ts'],
  dts: true,
  sourcemap: true,
  format: ['iife'],
  outDir: 'dist',
  platform: "browser",
  globalName: "spicyInput",
  minifyIdentifiers: !options.watch,
  minifySyntax: !options.watch,
  minifyWhitespace: !options.watch,
}))

export default config
