import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { BP_TOGGLE_PALETTE } from "./utils/constants";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  }),
  manifest: {
    permissions: ["favicon", "tabs", "activeTab", "bookmarks", "history"],
    web_accessible_resources: [
      {
        resources: ["_favicon/*"],
        matches: ["<all_urls>"],
      },
    ],
    action: {
      default_icon: {
        "16": "./icon/128.png",
        "32": "./icon/128.png",
        "48": "./icon/128.png",
        "128": "./icon/128.png",
      },
    },
    commands: {
      [BP_TOGGLE_PALETTE]: {
        suggested_key: {
          default: "Ctrl+Shift+K",
          mac: "Command+Shift+K",
        },
        description: "Toggle Tab Palette",
      },
    },
  },
});
