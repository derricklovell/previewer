"use client";

import dynamic from "next/dynamic";

export type LivePreviewProps = {
  /** Raw TSX source of the component to render. */
  componentCode: string;
  /** NPM packages the component needs, e.g. `{ "lucide-react": "latest" }`. */
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
