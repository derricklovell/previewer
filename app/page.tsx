import { redirect } from "next/navigation";

const DEFAULT_COMPONENT_ID = 8374;

export default function Home() {
  redirect(`/${DEFAULT_COMPONENT_ID}`);
}
