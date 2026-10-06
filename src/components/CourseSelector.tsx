"use client";

import { courseById, courses, topicById } from "@/lib/curriculum/alberta";
import { isOpenCourse, OPEN_COURSE_ID } from "@/lib/curriculum/allowed";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const OPEN_COURSE_LABEL = "Any level · no restrictions";

type CourseSelectorProps = {
  courseId: string;
  coveredUpTo: string;
  onCourseChange: (courseId: string) => void;
  onCoveredUpToChange: (topicId: string) => void;
};

export function CourseSelector({
  courseId,
  coveredUpTo,
  onCourseChange,
  onCoveredUpToChange,
}: CourseSelectorProps) {
  const open = isOpenCourse(courseId);
  const course = courses.find((item) => item.id === courseId);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">
        Course
        <Select
          value={open ? OPEN_COURSE_ID : (course?.id ?? OPEN_COURSE_ID)}
          onValueChange={(value) => {
            if (value) onCourseChange(value);
          }}
        >
          <SelectTrigger className="h-10 w-full" aria-label="Course">
            <SelectValue>
              {(value: string) => {
                if (isOpenCourse(value)) return OPEN_COURSE_LABEL;
                const selected = courseById.get(value);
                return selected
                  ? `${selected.code} · ${selected.institution}`
                  : value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OPEN_COURSE_ID}>{OPEN_COURSE_LABEL}</SelectItem>
            {courses.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.code} · {item.institution}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {open || !course ? (
        <p className="self-end text-sm text-muted-foreground">
          Any subject at any level, solved with the clearest standard method.
          Pick an Alberta calculus course to limit methods to what your class
          has covered.
        </p>
      ) : (
        <label className="grid gap-1.5 text-sm font-medium">
          Covered up to
          <Select
            value={coveredUpTo}
            onValueChange={(value) => {
              if (value) onCoveredUpToChange(value);
            }}
          >
            <SelectTrigger className="h-10 w-full" aria-label="Covered up to">
              <SelectValue>
                {(value: string) => topicById.get(value)?.name ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {course.topicOrder.map((topicId) => (
                <SelectItem key={topicId} value={topicId}>
                  {topicById.get(topicId)?.name ?? topicId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )}
    </div>
  );
}
