import { Suspense } from "react";
import { notFound } from "next/navigation";

import { LivePreview } from "@/components/LivePreview";
import { getComponent, type PreviewComponent } from "@/lib/twentyfirst";

export default function ComponentPage({ params }: PageProps<"/[componentId]">) {
  return (
    <main className="flex h-screen flex-col">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
            Loading…
          </div>
        }
      >
        <ComponentPreview params={params} />
      </Suspense>
    </main>
  );
}

async function ComponentPreview({
  params,
}: {
  params: Promise<{ componentId: string }>;
}) {
  const { componentId } = await params;
  const id = Number(componentId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  let component: PreviewComponent;
  try {
    component = await getComponent(id);
  } catch (error) {
    return (
      <p className="p-6 text-sm text-red-600">
        Could not load component {id}:{" "}
        {error instanceof Error ? error.message : "unknown error"}
      </p>
    );
  }

  if (component.missingImports.length > 0) {
    return <MissingFiles imports={component.missingImports} />;
  }

  return (
    <LivePreview
      className="min-h-0 flex-1"
      componentCode={component.componentCode}
      demoCode={component.demoCode}
      componentPath={component.componentPath}
      files={component.files}
      dependencies={component.dependencies}
    />
  );
}

function MissingFiles({ imports }: { imports: string[] }) {
  return (
    <div className="p-6 text-sm">
      <p className="font-semibold text-red-600">
        This component imports files the component API did not return:
      </p>
      <ul className="mt-2 list-disc pl-5 font-mono text-xs text-zinc-600 dark:text-zinc-400">
        {imports.map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
      <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
        Multi-file 21st.dev components need their registry files, which{" "}
        <code>get_component</code> returns under <code>registry.files</code>.
      </p>
    </div>
  );
}
