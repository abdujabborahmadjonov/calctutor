// Subjects CalcTutor solves. "auto" lets the model decide; the others steer
// notation and method and label the solution. Calculus I and II keep the
// Alberta course map (see lib/curriculum); every other subject is open-level.

export const SUBJECT_IDS = [
  "auto",
  "arithmetic",
  "algebra",
  "geometry",
  "trigonometry",
  "precalculus",
  "calculus",
  "multivariable",
  "linear-algebra",
  "differential-equations",
  "statistics",
  "discrete",
  "physics",
  "chemistry",
  "other",
] as const;

export type SubjectId = (typeof SUBJECT_IDS)[number];

export type Subject = {
  id: SubjectId;
  name: string;
  short: string;
  // A glyph shown on the subject chip; plain text so it needs no icon font.
  glyph: string;
  example: string;
};

export const subjects: Subject[] = [
  {
    id: "auto",
    name: "Detect automatically",
    short: "Auto",
    glyph: "✦",
    example: String.raw`2x^{2}-8x+6=0`,
  },
  {
    id: "arithmetic",
    name: "Arithmetic and fractions",
    short: "Arithmetic",
    glyph: "±",
    example: String.raw`\frac{3}{4}+\frac{5}{6}`,
  },
  {
    id: "algebra",
    name: "Algebra",
    short: "Algebra",
    glyph: "x",
    example: String.raw`x^{2}-5x+6=0`,
  },
  {
    id: "geometry",
    name: "Geometry",
    short: "Geometry",
    glyph: "△",
    example: "A right triangle has legs 6 and 8. Find the hypotenuse.",
  },
  {
    id: "trigonometry",
    name: "Trigonometry",
    short: "Trig",
    glyph: "θ",
    example: String.raw`2\sin x - 1 = 0, \; 0 \le x < 2\pi`,
  },
  {
    id: "precalculus",
    name: "Precalculus and functions",
    short: "Precalc",
    glyph: "ƒ",
    example: String.raw`\log_{2}(x+3)=5`,
  },
  {
    id: "calculus",
    name: "Calculus I and II",
    short: "Calculus",
    glyph: "∫",
    example: String.raw`\int x e^{x}\,dx`,
  },
  {
    id: "multivariable",
    name: "Multivariable calculus",
    short: "Calc III",
    glyph: "∂",
    example: String.raw`\frac{\partial}{\partial y}\left(x^{2}y^{3}\right)`,
  },
  {
    id: "linear-algebra",
    name: "Linear algebra",
    short: "Linear alg.",
    glyph: "▦",
    example: String.raw`\text{Eigenvalues of } \begin{pmatrix} 2 & 1 \\ 1 & 2 \end{pmatrix}`,
  },
  {
    id: "differential-equations",
    name: "Differential equations",
    short: "Diff. eq.",
    glyph: "y′",
    example: String.raw`y' = 2y,\; y(0)=3`,
  },
  {
    id: "statistics",
    name: "Statistics and probability",
    short: "Stats",
    glyph: "σ",
    example: "Mean and standard deviation of 4, 8, 15, 16, 23, 42",
  },
  {
    id: "discrete",
    name: "Discrete math and proofs",
    short: "Discrete",
    glyph: "∀",
    example: String.raw`\text{Prove } \sum_{k=1}^{n} k = \frac{n(n+1)}{2}`,
  },
  {
    id: "physics",
    name: "Physics",
    short: "Physics",
    glyph: "⚛",
    example:
      "A ball is thrown up at 12 m/s. How high does it go? Use g = 9.8 m/s².",
  },
  {
    id: "chemistry",
    name: "Chemistry",
    short: "Chemistry",
    glyph: "⚗",
    example: "How many grams of water form from 4.0 g of hydrogen gas?",
  },
  {
    id: "other",
    name: "Any other question",
    short: "Other",
    glyph: "?",
    example: "Why does the sky look blue?",
  },
];

export const subjectById = new Map(subjects.map((item) => [item.id, item]));

export function isSubjectId(value: unknown): value is SubjectId {
  return (
    typeof value === "string" &&
    (SUBJECT_IDS as readonly string[]).includes(value)
  );
}

// Labels a solution's topic_id: a course topic, a subject id, or a free-form
// id from the model such as "algebra.quadratics".
export function subjectForTopic(topicId: string): Subject | undefined {
  const head = topicId.split(/[.:/]/)[0] ?? "";
  return isSubjectId(head) && head !== "auto"
    ? subjectById.get(head)
    : undefined;
}
