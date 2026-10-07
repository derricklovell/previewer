import { findImports } from "@/lib/dependencies";

/** A file from a shadcn registry item (the format 21st.dev's registry serves). */
export type RegistryFile = {
  path: string;
  content: string;
  type?: string;
  target?: string;
};

const CODE_EXTENSION = /\.(tsx|ts|jsx|js)$/;

/** `@/components/ui/x` or `/components/ui/x.tsx` → `/components/ui/x.tsx`. */
export function toFilePath(importPath: string): string {
  const path = importPath.replace(/^@\//, "/").replace(/^(?!\/)/, "/");
  return CODE_EXTENSION.test(path) ? path : `${path}.tsx`;
}

/** Module path without a code extension or trailing `/index`. */
function moduleKey(path: string): string {
  return path.replace(CODE_EXTENSION, "").replace(/\/index$/, "");
}

function normalize(path: string): string {
  const out: string[] = [];
  for (const segment of path.split("/")) {
    if (segment === "..") out.pop();
    else if (segment && segment !== ".") out.push(segment);
  }
  return `/${out.join("/")}`;
}

/** Absolute module key for a local or `@/` import, or null for packages. */
function resolveImport(fromFile: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) return moduleKey(normalize(specifier.slice(1)));
  if (!specifier.startsWith(".")) return null;
  const dir = fromFile.slice(0, fromFile.lastIndexOf("/"));
  return moduleKey(normalize(`${dir}/${specifier}`));
}

/** Local imports across `files` that no file in `files` provides. */
export function findMissingImports(files: Record<string, string>): string[] {
  const provided = new Set(Object.keys(files).map(moduleKey));
  const missing = new Set<string>();
  for (const [path, code] of Object.entries(files)) {
    for (const specifier of findImports(code)) {
      const key = resolveImport(path, specifier);
      if (key && !provided.has(key)) missing.add(key);
    }
  }
  return [...missing];
}

/** Number of trailing path segments `a` and `b` share. */
function sharedTail(a: string, b: string): number {
  const x = a.split("/");
  const y = b.split("/");
  let n = 0;
  while (n < x.length && n < y.length && x[x.length - 1 - n] === y[y.length - 1 - n]) n++;
  return n;
}

/**
 * Places registry files into the sandbox file tree. Each file goes where the
 * code imports it from (matched on the longest shared path tail), since
 * registry paths need not match the import layout. Files nothing imports keep
 * their project path (`target`, or `path` without a leading `src/`).
 */
export function placeRegistryFiles(
  known: Record<string, string>,
  registryFiles: RegistryFile[],
): Record<string, string> {
  // Skip files the sandbox already has (the main component, lib/utils), even
  // when the registry's copy differs from the API's.
  const knownContents = new Set(Object.values(known).map((code) => code.trim()));
  const knownKeys = new Set(Object.keys(known).map(moduleKey));
  let pending = registryFiles.filter(
    (file) =>
      file.content?.trim() &&
      !knownContents.has(file.content.trim()) &&
      !knownKeys.has(moduleKey(projectPath(file))) &&
      file.type !== "registry:example",
  );
  const placed: Record<string, string> = {};

  // Placing a file can reveal imports of further files, so repeat until stable.
  for (let changed = true; changed && pending.length; ) {
    changed = false;
    const missing = findMissingImports({ ...known, ...placed });
    for (const file of [...pending]) {
      const key = moduleKey(projectPath(file));
      let best: string | null = null;
      let bestScore = 0;
      for (const need of missing) {
        const score = sharedTail(need, key);
        if (score > bestScore) [best, bestScore] = [need, score];
      }
      if (!best) continue;
      const extension = file.path.match(CODE_EXTENSION)?.[0] ?? ".tsx";
      const indexFile = /\/index\.\w+$/.test(file.path) ? "/index" : "";
      placed[`${best}${indexFile}${extension}`] = file.content;
      missing.splice(missing.indexOf(best), 1);
      pending = pending.filter((f) => f !== file);
      changed = true;
    }
  }

  for (const file of pending) placed[projectPath(file)] = file.content;
  return placed;
}

/** Where a registry file lives in a project: its target, else its path minus `src/`. */
function projectPath(file: RegistryFile): string {
  return normalize(file.target ?? file.path).replace(/^\/src\//, "/");
}
