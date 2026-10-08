import { defineConfig } from "vite";
import { one } from "one/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  ssr: {
    optimizeDeps: {
      // expo-asset is pulled into SSR dep-scan via expo-constants/
      // expo-linking and dies on a react-native-web asset-registry
      // subpath — it's native-only, so keep it out of the SSR bundle.
      exclude: ["expo-asset"],
    },
  },
  plugins: [
    one({
      web: {
        defaultRenderMode: "spa",
        // vite 8.1 experimental bundled dev (rolldown FullBundleDevEnvironment)
        experimentalBundledDev: !!process.env.BUNDLED_DEV,
      },

      // unified build mode — pages, api routes, and middlewares all build
      // against the same SSR server config (same defines, same plugins, same
      // externalization rules) and drops the blanket `ssr.noExternal: true`.
      // this is the direction One is moving; in the next major it becomes the
      // default and `build.api` / `build.middleware` lose their separate
      // config surfaces.
      build: {
        server: { unified: true },
      },

      react: {
        // React Compiler (babel-plugin-react-compiler) — auto-memoized
        // renders; keep components compiler-clean (no Date() in render, etc.)
        compiler: true,
      },

      ...(process.env.TEST_METRO && {
        native: {
          bundler: "metro",
          bundlerOptions: {
            // expo's metro default config drops "native" from resolver
            // platforms, so foo.native.ts never wins; restore it.
            defaultConfigOverrides: (dc) => {
              const platforms = new Set([...(dc?.resolver?.platforms ?? []), "native"]);
              return {
                ...dc,
                resolver: { ...dc?.resolver, platforms: [...platforms] },
              };
            },
          },
        },
      }),
    }),
    VitePWA({
      registerType: "autoUpdate",
      // One's SPA html is generated — register the SW from app code instead
      injectRegister: false,
      manifest: {
        name: "Pinya",
        short_name: "Pinya",
        description: "Private circles for the people around you.",
        theme_color: "#FBFBFA",
        background_color: "#FBFBFA",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/app-icon.png", sizes: "1024x1024", type: "image/png", purpose: "any" }],
      },
      // generateSW doesn't emit under One's unified rolldown build — the
      // app shell cache is a hand-rolled public/sw.js registered by src/boot
    }),
  ],
});
