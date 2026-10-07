import { LivePreview } from "@/components/LivePreview";

// Example payload in the shape the API returns: a TSX string plus its NPM deps.
const SAMPLE_CODE = `import * as React from "react";
import { Sparkles } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  ),
);
Button.displayName = "Button";

export function ButtonDemo() {
  return (
    <div className="flex gap-4">
      <Button>
        <Sparkles className="h-4 w-4" />
        Generate
      </Button>
      <Button variant="outline" size="lg">
        Outline
      </Button>
    </div>
  );
}
`;

const SAMPLE_DEPENDENCIES = {
  "lucide-react": "latest",
  "class-variance-authority": "latest",
};

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <LivePreview
        className="flex-1"
        componentCode={SAMPLE_CODE}
        dependencies={SAMPLE_DEPENDENCIES}
      />
    </main>
  );
}
