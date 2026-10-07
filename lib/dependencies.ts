// Packages the Sandpack vite-react-ts template already provides.
const PROVIDED_PACKAGES = new Set(["react", "react-dom"]);

const IMPORT_PATTERNS = [
  // import x from "pkg" / import { x } from "pkg" / export { x } from "pkg"
  /(?:^|[\s;])(?:import|export)\s[^'"]*?\sfrom\s*["']([^"']+)["']/g,
  // import "pkg"
  /(?:^|[\s;])import\s*["']([^"']+)["']/g,
  // import("pkg")
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
];

/** Every module specifier imported by `code`. */
export function findImports(code: string): string[] {
  const specifiers = new Set<string>();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of code.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

/** Maps a bare specifier like `@radix-ui/react-slot/dist` to its package name. */
function packageName(specifier: string): string | null {
  if (/^(\.|\/|@\/|~\/|node:)/.test(specifier)) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

/**
 * NPM packages imported by the given sources, pinned to `latest`. Local and
 * aliased imports, and packages the sandbox template ships, are skipped.
 */
export function inferDependencies(
  ...sources: (string | undefined)[]
): Record<string, string> {
  const dependencies: Record<string, string> = {};
  for (const source of sources) {
    if (!source) continue;
    for (const specifier of findImports(source)) {
      const name = packageName(specifier);
      if (name && !PROVIDED_PACKAGES.has(name)) dependencies[name] = "latest";
    }
  }
  return dependencies;
}
