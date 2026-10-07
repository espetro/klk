import { defineConfig } from "vite";
import { one } from "one/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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

      ...(process.env.TEST_METRO && {
        native: {
          bundler: "metro",
        },
      }),
    }),
    VitePWA({
      registerType: "autoUpdate",
      // One's SPA html is generated — register the SW from app code instead
      injectRegister: false,
      manifest: {
        name: "Klk",
        short_name: "Klk",
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
