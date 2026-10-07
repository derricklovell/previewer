import { cacheLife } from "next/cache";
import { findImports } from "@/lib/dependencies";

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
};

export type PreviewComponent = {
  id: number;
  name: string;
  description: string | null;
  componentCode: string;
  demoCode: string | null;
  /** Import path the demo uses for the component, e.g. `@/components/ui/pricing-table`. */
  componentPath: string;
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
  };
  const component = body.component?.component;
  if (!component?.componentCode) {
    throw new Error(`Component ${id} has no code`);
  }

  return {
    id: component.id,
    name: component.name,
    description: component.description ?? null,
    componentCode: component.componentCode,
    demoCode: component.demoCode?.trim() ? component.demoCode : null,
    componentPath: resolveComponentPath(component),
  };
}
