import {
  Camera,
  ClipboardCheck,
  GraduationCap,
  LineChart,
  ListOrdered,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: ListOrdered,
    title: "Every step, explained",
    body: "Each move names its rule and says why it works, with the common mistake to avoid.",
  },
  {
    icon: LineChart,
    title: "Interactive graphs",
    body: "Equations, functions, derivatives and integrals are plotted. Pan, zoom and trace.",
  },
  {
    icon: ShieldCheck,
    title: "Checked answers",
    body: "Every answer is self-checked, and SymPy verifies it in your browser where it can.",
  },
  {
    icon: GraduationCap,
    title: "Learn mode",
    body: "Hints first, your own answer checked, and the full solution only when you want it.",
  },
  {
    icon: ClipboardCheck,
    title: "Check my work",
    body: "Finds the first wrong line in your attempt without giving the answer away.",
  },
  {
    icon: Camera,
    title: "Snap or write",
    body: "Photograph a worksheet or write with Apple Pencil, then confirm what was read.",
  },
];

export function FeatureShowcase() {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
      <p className="mb-1 text-sm font-semibold text-primary">
        Your solution appears here
      </p>
      <h2 className="mb-6 text-xl font-semibold tracking-tight">
        Math, physics, chemistry and more, solved like a tutor would.
      </h2>
      <ul className="grid gap-5 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-4.5" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-sm text-muted-foreground">
                {body}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
