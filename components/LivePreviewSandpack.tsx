"use client";

import { useMemo } from "react";
import { Sandpack, type SandpackFiles } from "@codesandbox/sandpack-react";

import { inferDependencies } from "@/lib/dependencies";
import type { LivePreviewProps } from "./LivePreview";

const DEFAULT_DEPENDENCIES: Record<string, string> = {
  clsx: "^2.1.1",
  "tailwind-merge": "^2.6.0",
};

// Tailwind v3 toolchain, compiled by Vite inside the Nodebox sandbox.
const DEV_DEPENDENCIES: Record<string, string> = {
  tailwindcss: "^3.4.17",
  postcss: "^8.4.49",
  autoprefixer: "^10.4.20",
  "tailwindcss-animate": "^1.0.7",
};

// Renders the entry module's default export, falling back to a `*Demo` export
// and then to the first PascalCase component export.
const appTsx = (entry: string) => `import * as Module from "${entry}";

type AnyComponent = React.ComponentType<Record<string, unknown>>;

const isComponent = (value: unknown): value is AnyComponent =>
  typeof value === "function" ||
  (typeof value === "object" && value !== null && "$$typeof" in value);

function resolveComponent(): AnyComponent | null {
  const exports = Module as Record<string, unknown>;
  if (isComponent(exports.default)) return exports.default;

  const named = Object.entries(exports).filter(
    ([name, value]) => /^[A-Z]/.test(name) && isComponent(value),
  );
  const demo = named.find(([name]) => /Demo$/.test(name));
  return (demo ?? named[0])?.[1] ?? null;
}

const Target = resolveComponent();

export default function App() {
  if (!Target) {
    return (
      <p className="p-4 text-sm text-red-500">
        No React component export found in ${entry}
      </p>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-6 text-foreground">
      <Target />
    </div>
  );
}
`;

const UTILS_TS = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const STYLES_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }
}
`;

const TAILWIND_CONFIG_JS = `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
`;

const POSTCSS_CONFIG_JS = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

// Vite ignores tsconfig "paths", so the "@/..." alias is resolved here. PostCSS
// is also wired explicitly: Vite running inside Nodebox does not auto-load
// postcss.config.js, so the plugins are passed inline.
const VITE_CONFIG_TS = `import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
`;

const TSCONFIG_JSON = JSON.stringify(
  {
    compilerOptions: {
      target: "ESNext",
      useDefineForClassFields: true,
      lib: ["DOM", "DOM.Iterable", "ESNext"],
      allowJs: false,
      skipLibCheck: true,
      esModuleInterop: false,
      allowSyntheticDefaultImports: true,
      strict: true,
      forceConsistentCasingInFileNames: true,
      module: "ESNext",
      moduleResolution: "Node",
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      baseUrl: ".",
      paths: { "@/*": ["./*"] },
    },
    include: ["**/*.ts", "**/*.tsx"],
    exclude: ["node_modules"],
    references: [{ path: "./tsconfig.node.json" }],
  },
  null,
  2,
);

/** `@/components/ui/x` or `/components/ui/x.tsx` → `/components/ui/x.tsx`. */
function toFilePath(importPath: string): string {
  const path = importPath.replace(/^@\//, "/").replace(/^(?!\/)/, "/");
  return /\.[jt]sx?$/.test(path) ? path : `${path}.tsx`;
}

export default function LivePreviewSandpack({
  componentCode,
  demoCode,
  componentPath,
  dependencies,
  className,
}: LivePreviewProps) {
  const files = useMemo<SandpackFiles>(() => {
    // With a demo, the component lives where the demo imports it from and the
    // demo is what gets rendered, as on 21st.dev.
    const componentFile = toFilePath(
      componentPath ?? (demoCode ? "@/components/ui/component" : "/Component"),
    );
    const entryFile = demoCode ? "/Demo.tsx" : componentFile;

    return {
      "/App.tsx": {
        code: appTsx(`.${entryFile.replace(/\.[jt]sx?$/, "")}`),
        hidden: true,
      },
      [componentFile]: { code: componentCode, active: !demoCode },
      ...(demoCode ? { "/Demo.tsx": { code: demoCode, active: true } } : {}),
      "/lib/utils.ts": { code: UTILS_TS, hidden: true },
      "/styles.css": { code: STYLES_CSS, hidden: true },
      "/tailwind.config.js": { code: TAILWIND_CONFIG_JS, hidden: true },
      "/postcss.config.js": { code: POSTCSS_CONFIG_JS, hidden: true },
      "/vite.config.ts": { code: VITE_CONFIG_TS, hidden: true },
      "/tsconfig.json": { code: TSCONFIG_JSON, hidden: true },
    };
  }, [componentCode, demoCode, componentPath]);

  const mergedDependencies = useMemo(
    () => ({
      ...DEFAULT_DEPENDENCIES,
      ...inferDependencies(componentCode, demoCode ?? undefined),
      ...dependencies,
    }),
    [componentCode, demoCode, dependencies],
  );

  // Changing dependencies requires a fresh `npm install` in the sandbox, so
  // remount instead of hot-updating files.
  const dependencyKey = useMemo(
    () => JSON.stringify(mergedDependencies),
    [mergedDependencies],
  );

  return (
    <div className={className ?? "h-full w-full"}>
      <Sandpack
        key={dependencyKey}
        template="vite-react-ts"
        files={files}
        customSetup={{
          environment: "node",
          dependencies: mergedDependencies,
          devDependencies: DEV_DEPENDENCIES,
        }}
        options={{
          showNavigator: false,
          showTabs: false,
          editorHeight: "100%",
          // The preset always mounts a code editor; collapse it so only the
          // rendered preview is visible.
          editorWidthPercentage: 0,
          resizablePanels: false,
          classes: {
            "sp-wrapper": "!h-full",
            "sp-layout": "!h-full !rounded-none !border-0",
            "sp-editor": "!hidden",
          },
        }}
      />
    </div>
  );
}
