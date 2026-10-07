# previewer

Live component previewer for raw TSX strings (Shadcn/Tailwind components with
ESM imports and NPM dependencies), powered by CodeSandbox
[Sandpack](https://sandpack.codesandbox.io/) on the `vite-react-ts` template.

## Routes

- `/<componentId>` fetches the component from the 1ovr1 `21st_dev_mcp/get_component`
  API on the server (cached for hours) and previews it the way 21st.dev does: the
  component's `demoCode` is rendered, and `componentCode` is placed at the path the
  demo imports it from (e.g. `@/components/ui/pricing-table`).
- `/` redirects to the default component, `/8374`.

## Usage

```tsx
import { LivePreview } from "@/components/LivePreview";

<LivePreview
  className="h-[600px]"
  componentCode={component.componentCode}
  demoCode={component.demoCode} // optional: rendered instead of the component
  componentPath="@/components/ui/pricing-table" // where the demo imports it from
  dependencies={{ "lucide-react": "^0.400.0" }} // optional: overrides detected versions
/>;
```

The preview fills the wrapper, so give it a height (via `className` or its parent).

## How it works

`components/LivePreview.tsx` loads `components/LivePreviewSandpack.tsx` client-side
only (`next/dynamic` with `ssr: false`). That component mounts `<Sandpack>` on the
`react-ts` template, which compiles in Sandpack's **in-browser bundler**: packages are
fetched pre-bundled from CodeSandbox's CDN, with no `npm install`. (The Node-based
`vite-react-ts` template ran a full npm install of 150+ packages and a Vite server
inside the browser on every visit, which took minutes and often failed.)

Virtual file system:

| File                 | Contents                                                        |
| -------------------- | --------------------------------------------------------------- |
| `/App.tsx`           | Renders the entry's default export, else a `*Demo` export, else the first PascalCase component export. The entry is `/Demo.tsx` when there is a demo, otherwise the component |
| `/Demo.tsx`          | `demoCode`, when provided                                       |
| `componentPath` file | `componentCode`, e.g. `/components/ui/pricing-table.tsx`; `/Component.tsx` when there is no demo |
| `/lib/utils.ts`      | Shadcn `cn()` (`clsx` + `tailwind-merge`)                       |
| `/index.tsx`         | Sets the Shadcn theme as the Tailwind config, then mounts `<App />` |
| `/styles.css`        | Shadcn theme CSS variables                                      |

- **Tailwind** comes from the Tailwind v3 browser build (`cdn.tailwindcss.com`, loaded
  through Sandpack's `externalResources`). It generates classes from the rendered DOM,
  so no PostCSS step is needed.
- **`@/` imports** are rewritten to relative paths before the files reach the bundler.
- **NPM dependencies** are detected from the import statements in the component and
  demo (`lib/dependencies.ts`) and fetched at `latest`. `clsx` and `tailwind-merge` are
  always included, and the `dependencies` prop overrides any detected version.

## Development

```bash
npm install
npm run dev
```
