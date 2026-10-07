# previewer

Live component previewer for raw TSX strings (Shadcn/Tailwind components with
ESM imports and NPM dependencies), powered by CodeSandbox
[Sandpack](https://sandpack.codesandbox.io/) on the `vite-react-ts` template.

## Usage

```tsx
import { LivePreview } from "@/components/LivePreview";

<LivePreview
  className="h-[600px]"
  componentCode={code} // TSX string from the API
  dependencies={{ "lucide-react": "latest" }}
/>;
```

The preview fills the wrapper, so give it a height (via `className` or its parent).

## How it works

`components/LivePreview.tsx` loads `components/LivePreviewSandpack.tsx` client-side
only (`next/dynamic` with `ssr: false`). That component mounts `<Sandpack>` with
this virtual file system:

| File                  | Contents                                                        |
| --------------------- | --------------------------------------------------------------- |
| `/App.tsx`            | Renders `/Component.tsx`'s default export, else a `*Demo` export, else the first PascalCase component export |
| `/Component.tsx`      | `componentCode`                                                 |
| `/lib/utils.ts`       | Shadcn `cn()` (`clsx` + `tailwind-merge`)                       |
| `/styles.css`         | `@tailwind` directives + Shadcn theme CSS variables             |
| `/tailwind.config.js` | Tailwind v3 config with the Shadcn color tokens                 |
| `/postcss.config.js`  | Standard `tailwindcss` + `autoprefixer` config                  |
| `/vite.config.ts`     | `@` → project root alias, and PostCSS plugins passed inline     |
| `/tsconfig.json`      | `"@/*": ["./*"]` path mapping                                   |

`clsx` and `tailwind-merge` are always installed; the `dependencies` prop is merged
on top (and overrides them). Changing dependencies remounts the sandbox so it
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
