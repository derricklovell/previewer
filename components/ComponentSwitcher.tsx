"use client";

import { useRouter } from "next/navigation";

export function ComponentSwitcher({ currentId }: { currentId?: number }) {
  const router = useRouter();

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const id = new FormData(event.currentTarget).get("id")?.toString().trim();
        if (id) router.push(`/${encodeURIComponent(id)}`);
      }}
    >
      <label htmlFor="component-id" className="text-xs text-zinc-500">
        Component ID
      </label>
      <input
        id="component-id"
        name="id"
        inputMode="numeric"
        defaultValue={currentId}
        className="w-24 rounded-md border border-zinc-300 bg-transparent px-2 py-1 text-sm dark:border-zinc-700"
      />
      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-3 py-1 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Preview
      </button>
    </form>
  );
}
