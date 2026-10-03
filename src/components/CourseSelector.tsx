"use client";

import { courseById, courses, topicById } from "@/lib/curriculum/alberta";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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
  const course = courses.find((item) => item.id === courseId) ?? courses[0];

  if (!course) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-medium">
        Course
        <Select
          value={course.id}
          onValueChange={(value) => {
            if (value) onCourseChange(value);
          }}
        >
          <SelectTrigger className="h-10 w-full" aria-label="Course">
            <SelectValue>
              {(value: string) => {
                const selected = courseById.get(value);
                return selected
                  ? `${selected.code} · ${selected.institution}`
                  : value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {courses.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.code} · {item.institution}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
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
    </div>
  );
}
