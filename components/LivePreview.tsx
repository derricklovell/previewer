"use client";

import dynamic from "next/dynamic";

export type LivePreviewProps = {
  /** Raw TSX source of the component. */
  componentCode: string;
  /**
   * Optional 21st.dev-style demo that imports the component and is rendered
   * instead of it, e.g. `import X from "@/components/ui/pricing-table"`.
   */
  demoCode?: string | null;
  /**
   * Import path the demo uses for the component (`@/components/ui/<slug>`).
   * Without a demo, the component is written to `/Component.tsx`.
   */
  componentPath?: string;
  /**
   * NPM packages to install, e.g. `{ "lucide-react": "latest" }`. Packages
   * imported by the code are detected automatically; entries here override
   * the detected versions.
   */
  dependencies?: Record<string, string>;
  /** Classes for the outer wrapper. The preview fills this element. */
  className?: string;
};

// Sandpack boots a browser-only bundler and reads non-deterministic values
// during render, so it must never be prerendered on the server.
const LivePreviewSandpack = dynamic(() => import("./LivePreviewSandpack"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      Loading preview…
    </div>
  ),
});

export function LivePreview(props: LivePreviewProps) {
  return <LivePreviewSandpack {...props} />;
}

export default LivePreview;
