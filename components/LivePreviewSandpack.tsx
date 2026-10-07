"use client";

import { useMemo } from "react";
import { Sandpack, type SandpackFiles } from "@codesandbox/sandpack-react";

import { inferDependencies } from "@/lib/dependencies";
import { toFilePath } from "@/lib/preview-files";
import type { LivePreviewProps } from "./LivePreview";

const DEFAULT_DEPENDENCIES: Record<string, string> = {
  clsx: "^2.1.1",
  "tailwind-merge": "^2.6.0",
};

// Tailwind v3 browser build: generates utility classes at runtime from the
// rendered DOM, so the in-browser bundler needs no PostCSS step. The
// container-queries plugin adds the `@container` / `@lg:` variants.
const TAILWIND_CDN = "https://cdn.tailwindcss.com?plugins=container-queries";

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

// The shadcn theme tokens, applied to the Tailwind browser build before the
// app renders.
const INDEX_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App";

(window as any).tailwind.config = {
  darkMode: ["class"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;

const UTILS_TS = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

// Plain CSS: the Tailwind browser build supplies preflight and utilities.
const STYLES_CSS = `:root {
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
  border-color: hsl(var(--border));
}

body {
  margin: 0;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
`;

/**
 * Rewrites `@/...` imports in a file to relative paths, so the alias works
 * without bundler path-mapping support.
 */
function resolveAliases(code: string, filePath: string): string {
  const depth = filePath.split("/").length - 2;
  const prefix = depth > 0 ? "../".repeat(depth) : "./";
  return code.replace(
    /(\bfrom\s*|\bimport\s*\(?\s*)(["'])@\//g,
    (_, keyword: string, quote: string) => `${keyword}${quote}${prefix}`,
  );
}

export default function LivePreviewSandpack({
  componentCode,
  demoCode,
  componentPath,
  files: extraFiles,
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
      "/index.tsx": { code: INDEX_TSX, hidden: true },
      [componentFile]: {
        code: resolveAliases(componentCode, componentFile),
        active: !demoCode,
      },
      ...(demoCode
        ? {
            "/Demo.tsx": {
              code: resolveAliases(demoCode, "/Demo.tsx"),
              active: true,
            },
          }
        : {}),
      ...Object.fromEntries(
        Object.entries(extraFiles ?? {}).map(([path, code]) => [
          path,
          { code: resolveAliases(code, path), hidden: true },
        ]),
      ),
      "/lib/utils.ts": { code: UTILS_TS, hidden: true },
      "/styles.css": { code: STYLES_CSS, hidden: true },
    };
  }, [componentCode, demoCode, componentPath, extraFiles]);

  const mergedDependencies = useMemo(
    () => ({
      ...DEFAULT_DEPENDENCIES,
      ...inferDependencies(
        componentCode,
        demoCode ?? undefined,
        ...Object.values(extraFiles ?? {}),
      ),
      ...dependencies,
    }),
    [componentCode, demoCode, extraFiles, dependencies],
  );

  // Changing dependencies requires the bundler to fetch new packages, so
  // remount instead of hot-updating files.
  const dependencyKey = useMemo(
    () => JSON.stringify(mergedDependencies),
    [mergedDependencies],
  );

  return (
    <div className={className ?? "h-full w-full"}>
      <Sandpack
        key={dependencyKey}
        // Runs in Sandpack's in-browser bundler: packages come pre-bundled
        // from CodeSandbox's CDN instead of an npm install in Nodebox.
        template="react-ts"
        files={files}
        customSetup={{ dependencies: mergedDependencies }}
        options={{
          externalResources: [TAILWIND_CDN],
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
