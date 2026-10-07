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
only (`next/dynamic` with `ssr: false`). That component mounts `<Sandpack>` with
this virtual file system:

| File                  | Contents                                                        |
| --------------------- | --------------------------------------------------------------- |
| `/App.tsx`            | Renders the entry's default export, else a `*Demo` export, else the first PascalCase component export. The entry is `/Demo.tsx` when there is a demo, otherwise the component |
| `/Demo.tsx`           | `demoCode`, when provided                                      |
| `componentPath` file  | `componentCode`, e.g. `/components/ui/pricing-table.tsx`; `/Component.tsx` when there is no demo |
| `/lib/utils.ts`       | Shadcn `cn()` (`clsx` + `tailwind-merge`)                       |
| `/styles.css`         | `@tailwind` directives + Shadcn theme CSS variables             |
| `/tailwind.config.js` | Tailwind v3 config with the Shadcn color tokens                 |
| `/postcss.config.js`  | Standard `tailwindcss` + `autoprefixer` config                  |
| `/vite.config.ts`     | `@` → project root alias, and PostCSS plugins passed inline     |
| `/tsconfig.json`      | `"@/*": ["./*"]` path mapping                                   |

NPM dependencies are detected from the import statements in the component and demo
(`lib/dependencies.ts`) and installed at `latest`. `clsx` and `tailwind-merge` are
always installed, and the `dependencies` prop overrides any detected version. Changing dependencies remounts the sandbox so it
reinstalls.

Two notes on the sandbox:

- Vite running in Nodebox does not auto-load `postcss.config.js`, so
  `vite.config.ts` passes `tailwindcss()` and `autoprefixer()` through
  `css.postcss`. Tailwind still reads `/tailwind.config.js`.
- Vite ignores tsconfig `paths`, so the `@/` alias is set in `vite.config.ts`.

## Development

```bash
npm install
npm run dev
```
