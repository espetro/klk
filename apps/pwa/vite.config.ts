import { defineConfig } from "vite";
import { one } from "one/vite";
import { VitePWA } from "vite-plugin-pwa";

type OnePluginOptions = NonNullable<Parameters<typeof one>[0]>;
type OneNativeOptions = NonNullable<Exclude<OnePluginOptions["native"], false>>;

const appManifest: NonNullable<OneNativeOptions["app"]> = {
  // v2 app manifest — replaces the expo-shaped app.json.
  name: "Pinya",
  scheme: "club.pinya.app",
  icon: { source: "./public/app-icon.png", backgroundColor: "#000000" },
  splash: { source: "./public/splash.png", resizeMode: "contain", backgroundColor: "#000000" },
  ios: { bundleId: "club.pinya.app", deploymentTarget: "17.0" },
  android: { applicationId: "club.pinya.app" },
};

const nativeOptions: OneNativeOptions = process.env.TEST_METRO
  ? {
      app: appManifest,
      bundler: "metro",
      bundlerOptions: {
        // the default metro config drops "native" from resolver
        // platforms, so foo.native.ts never wins; restore it.
        defaultConfigOverrides: (dc) => {
          const platforms = new Set([...(dc?.resolver?.platforms ?? []), "native"]);
          return {
            ...dc,
            resolver: { ...dc?.resolver, platforms: [...platforms] },
          };
        },
      },
    }
  : { app: appManifest };

export default defineConfig({
  plugins: [
    one({
      web: {
        defaultRenderMode: "spa",
        // vite 8.1 experimental bundled dev (rolldown FullBundleDevEnvironment)
        experimentalBundledDev: !!process.env.BUNDLED_DEV,
      },

      react: {
        // React Compiler — auto-memoized renders; keep components
        // compiler-clean (no Date() in render, etc.). Runs via Oxc.
        compiler: true,
      },

      native: nativeOptions,
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
