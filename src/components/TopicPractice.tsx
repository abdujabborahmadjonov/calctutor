"use client";

import { useEffect, useState } from "react";

import { courseById, DEFAULT_COURSE_ID } from "@/lib/curriculum/alberta";
import { getDefaultCoveredUpTo } from "@/lib/curriculum/allowed";
import { getSetting } from "@/lib/storage/history";

import { PracticeSimilar } from "./PracticeSimilar";

// Uses the student's saved course so practice stays within their methods.
// If the topic is not on that course's map yet, the course's full topic list
// is used as "covered up to".
export function TopicPractice({ topicId }: { topicId: string }) {
  const [course, setCourse] = useState({
    courseId: DEFAULT_COURSE_ID,
    coveredUpTo: getDefaultCoveredUpTo(),
  });

  useEffect(() => {
    void Promise.all([getSetting("courseId"), getSetting("coveredUpTo")]).then(
      ([storedCourse, storedCovered]) => {
        const courseId =
          typeof storedCourse?.value === "string" &&
          courseById.has(storedCourse.value)
            ? storedCourse.value
            : DEFAULT_COURSE_ID;
        const order = courseById.get(courseId)?.topicOrder ?? [];
        const covered =
          typeof storedCovered?.value === "string" ? storedCovered.value : "";
        const coversTopic =
          order.indexOf(topicId) !== -1 &&
          order.indexOf(topicId) <= order.indexOf(covered);
        setCourse({
          courseId,
          coveredUpTo: coversTopic ? covered : getDefaultCoveredUpTo(courseId),
        });
      },
    );
  }, [topicId]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Practice</h2>
      <PracticeSimilar
        key={`${course.courseId}-${course.coveredUpTo}`}
        problemLatex=""
        topicId={topicId}
        courseId={course.courseId}
        coveredUpTo={course.coveredUpTo}
        buttonLabel="Give me three practice problems"
      />
    </section>
  );
}
