import { cacheLife } from "next/cache";
import { findImports } from "@/lib/dependencies";
import {
  findMissingImports,
  placeRegistryFiles,
  toFilePath,
  type RegistryFile,
} from "@/lib/preview-files";

const COMPONENT_API_URL =
  "https://api.1ovr1.com/api:o-B1LTj7/21st_dev_mcp/get_component";

/** The fields of the get_component response the previewer uses. */
type ApiComponent = {
  id: number;
  name: string;
  description?: string | null;
  demoName?: string | null;
  installCommand?: string | null;
  componentCode: string;
  demoCode?: string | null;
  /** Registry files (helpers the component imports), shadcn registry format. */
  files?: RegistryFile[] | null;
  /** NPM packages from the registry item, e.g. `motion` or `motion@^11`. */
  dependencies?: string[] | null;
};

/**
 * The `registry` the API returns next to `component`: every file the component
 * needs (helpers, lib/utils, registry dependencies) and its npm packages.
 */
type ApiRegistry = {
  files?: RegistryFile[] | null;
  npm?: string[] | null;
  dependencies?: string[] | null;
};

// Provided by the sandbox template.
const TEMPLATE_PACKAGES = new Set(["react", "react-dom"]);

export type PreviewComponent = {
  id: number;
  name: string;
  description: string | null;
  componentCode: string;
  demoCode: string | null;
  /** Import path the demo uses for the component, e.g. `@/components/ui/pricing-table`. */
  componentPath: string;
  /** Helper files by sandbox path, e.g. `/components/ui/x-utils/types.ts`. */
  files: Record<string, string>;
  /** NPM packages listed by the registry item, by name. */
  dependencies: Record<string, string>;
  /** Local imports that no file provides, e.g. `/components/ui/x-utils/types`. */
  missingImports: string[];
};

/** Registry slug from `npx shadcn add "https://21st.dev/r/<user>/<slug>?..."`. */
function registrySlug(installCommand?: string | null): string | null {
  return installCommand?.match(/21st\.dev\/r\/[^/]+\/([^/?"'\s]+)/)?.[1] ?? null;
}

/**
 * Works out where the demo expects the component to live. 21st.dev demos
 * import it through the shadcn registry alias, e.g. `@/components/ui/<slug>`.
 */
function resolveComponentPath(component: ApiComponent): string {
  const slug = registrySlug(component.installCommand);
  const aliased = findImports(component.demoCode ?? "").filter(
    (specifier) => specifier.startsWith("@/") && specifier !== "@/lib/utils",
  );
  const bySlug = slug
    ? aliased.find((specifier) => specifier.split("/").pop() === slug)
    : undefined;

  return bySlug ?? aliased[0] ?? `@/components/ui/${slug ?? "component"}`;
}

export async function getComponent(id: number): Promise<PreviewComponent> {
  "use cache";
  cacheLife("hours");

  const response = await fetch(COMPONENT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ component: id }),
  });
  if (!response.ok) {
    throw new Error(`Component API returned ${response.status} for ${id}`);
  }

  const body = (await response.json()) as {
    component?: { component?: ApiComponent };
    registry?: ApiRegistry | null;
  };
  const component = body.component?.component;
  if (!component?.componentCode) {
    throw new Error(`Component ${id} has no code`);
  }
  const registry = body.registry;

  const componentPath = resolveComponentPath(component);
  const demoCode = component.demoCode?.trim() ? component.demoCode : null;
  // The files the sandbox always has; /lib/utils.ts is supplied by the previewer.
  const known: Record<string, string> = {
    [toFilePath(componentPath)]: component.componentCode,
    ...(demoCode ? { "/Demo.tsx": demoCode } : {}),
    "/lib/utils.ts": "",
  };
  const files = placeRegistryFiles(known, [
    ...(component.files ?? []),
    ...(registry?.files ?? []),
  ]);

  return {
    id: component.id,
    name: component.name,
    description: component.description ?? null,
    componentCode: component.componentCode,
    demoCode,
    componentPath,
    files,
    dependencies: parseDependencies([
      ...(component.dependencies ?? []),
      ...(registry?.dependencies ?? []),
      ...(registry?.npm ?? []),
    ]),
    missingImports: findMissingImports({ ...known, ...files }),
  };
}

/** `["motion@^11", "@radix-ui/react-slot"]` → `{ motion: "^11", "@radix-ui/react-slot": "latest" }`. */
function parseDependencies(specs: string[]): Record<string, string> {
  const dependencies: Record<string, string> = {};
  for (const spec of specs) {
    const at = spec.lastIndexOf("@");
    const [name, version] = at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, "latest"];
    if (!TEMPLATE_PACKAGES.has(name)) dependencies[name] = version;
  }
  return dependencies;
}
