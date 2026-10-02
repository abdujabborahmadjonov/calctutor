import { courseById, DEFAULT_COURSE_ID, topicById } from "./alberta";

export class CurriculumError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CurriculumError";
  }
}

export function getCourse(courseId: string) {
  const course = courseById.get(courseId);

  if (!course) {
    throw new CurriculumError(`Unknown course: ${courseId}`);
  }

  return course;
}

export function getDefaultCoveredUpTo(courseId = DEFAULT_COURSE_ID) {
  const course = getCourse(courseId);
  const lastTopic = course.topicOrder.at(-1);

  if (!lastTopic) {
    throw new CurriculumError(`Course has no topics: ${courseId}`);
  }

  return lastTopic;
}

export function getAllowedCurriculum(courseId: string, coveredUpTo: string) {
  const course = getCourse(courseId);
  const coveredIndex = course.topicOrder.indexOf(coveredUpTo);

  if (coveredIndex < 0) {
    throw new CurriculumError(
      `Topic ${coveredUpTo} is not part of ${course.code}`,
    );
  }

  const allowedTopicIds = course.topicOrder.slice(0, coveredIndex + 1);
  const notYetCoveredIds = course.topicOrder.slice(coveredIndex + 1);
  const allowedMethods = [
    ...new Set(
      allowedTopicIds.flatMap((id) => topicById.get(id)?.methods ?? []),
    ),
  ];

  return {
    course,
    allowedTopicIds,
    allowedMethods,
    notYetCoveredIds,
  };
}

export function buildCourseBlock(
  courseId: string,
  coveredUpTo: string,
): string {
  const { course, allowedTopicIds, allowedMethods, notYetCoveredIds } =
    getAllowedCurriculum(courseId, coveredUpTo);
  const notYetCovered = notYetCoveredIds
    .map((id) => topicById.get(id)?.name ?? id)
    .join(", ");
  const inverseTrig =
    course.notation.inverseTrig === "arcsin"
      ? String.raw`\arcsin`
      : String.raw`\sin^{-1}`;

  return [
    "<course>",
    `id: ${course.id}`,
    `name: ${course.code} ${course.name} (${course.institution})`,
    `level: ${course.level}`,
    `covered_up_to: ${coveredUpTo}`,
    `allowed_topics: ${allowedTopicIds.join(", ")}`,
    `allowed_methods: ${allowedMethods.join("; ")}`,
    `not_yet_covered: ${notYetCovered || "none"}`,
    `notation: inverse trig as ${inverseTrig}; natural log as \\ln; intervals in ${course.notation.intervals} notation; ${course.notation.rationalizeDenominators ? "rationalize denominators" : "leave radicals in denominators"}`,
    "</course>",
  ].join("\n");
}
