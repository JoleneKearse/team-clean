import { useMemo, useState } from "react";

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { useSchedule } from "../context/ScheduleContext";
import { DAYS, JOBS, getNecessaryJobStyle } from "../constants/consts";
import type { DayKey } from "../types/types";

type CalendarWeeklyProps = {
  highlightedDayKey: DayKey;
  isEditMode: boolean;
};

type DragAssignmentPayload = {
  source: "calendar";
  day: DayKey;
  jobIndex: number;
  initials: string;
};

type DropPayload = {
  day: DayKey;
  jobIndex: number;
};

function isDayKey(value: unknown): value is DayKey {
  return (
    value === "mon" ||
    value === "tue" ||
    value === "wed" ||
    value === "thu" ||
    value === "fri"
  );
}

function parseDragPayload(payload: unknown): DragAssignmentPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<DragAssignmentPayload>;
  const jobIndex = candidate.jobIndex;

  if (
    candidate.source !== "calendar" ||
    !isDayKey(candidate.day) ||
    typeof jobIndex !== "number" ||
    !Number.isInteger(jobIndex) ||
    typeof candidate.initials !== "string"
  ) {
    return null;
  }

  return {
    source: candidate.source,
    day: candidate.day,
    jobIndex,
    initials: candidate.initials,
  };
}

function parseDropPayload(payload: unknown): DropPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<DropPayload>;
  const jobIndex = candidate.jobIndex;

  if (
    !isDayKey(candidate.day) ||
    typeof jobIndex !== "number" ||
    !Number.isInteger(jobIndex)
  ) {
    return null;
  }

  return {
    day: candidate.day,
    jobIndex,
  };
}

type CalendarDraggableInitialsProps = {
  day: DayKey;
  jobIndex: number;
  initials: string;
  isEditMode: boolean;
  className?: string;
};

function CalendarDraggableInitials({
  day,
  jobIndex,
  initials,
  isEditMode,
  className,
}: CalendarDraggableInitialsProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `calendar-drag-${day}-${jobIndex}`,
      data: {
        source: "calendar",
        day,
        jobIndex,
        initials,
      } as DragAssignmentPayload,
      disabled: !initials || !isEditMode,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.35 : 1,
    touchAction: isEditMode ? ("none" as const) : ("auto" as const),
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      className={[
        className ?? "",
        initials && isEditMode ? "cursor-grab active:cursor-grabbing" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...listeners}
      {...attributes}
    >
      {initials}
    </span>
  );
}

type CalendarDroppableCellProps = {
  day: DayKey;
  jobIndex: number;
  isEditMode: boolean;
  isDisabled?: boolean;
  className: string;
  children: React.ReactNode;
};

function CalendarDroppableCell({
  day,
  jobIndex,
  isEditMode,
  isDisabled = false,
  className,
  children,
}: CalendarDroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `calendar-drop-${day}-${jobIndex}`,
    data: {
      day,
      jobIndex,
    } as DropPayload,
    disabled: !isEditMode || isDisabled,
  });

  return (
    <td
      ref={setNodeRef}
      className={[className, isOver ? "ring-2 ring-pink-400" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}

const CalendarWeekly = ({
  highlightedDayKey,
  isEditMode,
}: CalendarWeeklyProps) => {
  const {
    weeklyAssignments,
    weeklyPublicHolidays,
    weeklyReassignmentFlags,
    swapAssignments,
  } = useSchedule();
  const [activeInitials, setActiveInitials] = useState("");

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 8,
      },
    }),
  );

  const onDragStart = (event: DragStartEvent) => {
    if (!isEditMode) return;

    const source = parseDragPayload(event.active.data.current);
    setActiveInitials(source?.initials ?? "");
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveInitials("");
    if (!isEditMode) return;

    if (!event.over) return;

    const source = parseDragPayload(event.active.data.current);
    const target = parseDropPayload(event.over.data.current);
    if (!source || !target) return;
    if (source.day !== target.day) return;
    if (weeklyPublicHolidays[source.day]) return;
    if (weeklyPublicHolidays[target.day]) return;
    if (source.jobIndex === target.jobIndex) return;

    const sourceInitials = weeklyAssignments[source.day][source.jobIndex] ?? "";
    if (!sourceInitials) return;

    swapAssignments(source.day, source.jobIndex, target.jobIndex);
  };

  const onDragCancel = () => {
    setActiveInitials("");
  };

  const overlayClassName = useMemo(
    () =>
      [
        "rounded-md border border-gray-600 bg-gray-100 px-2 py-1 text-sm shadow-md",
        activeInitials ? "opacity-95" : "opacity-0",
      ]
        .filter(Boolean)
        .join(" "),
    [activeInitials],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="relative w-full">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-2xl bg-[linear-gradient(to_bottom_right,var(--color-purple-500),var(--color-sky-500),var(--color-lime-500),var(--color-yellow-500),var(--color-orange-500))] opacity-75 blur-sm"
        />
        <div className="relative w-full rounded-xl bg-[linear-gradient(to_bottom_right,var(--color-purple-500),var(--color-sky-500),var(--color-lime-500),var(--color-yellow-500),var(--color-orange-500))] p-px shadow-lg">
          <article className="w-full overflow-hidden rounded-lg text-center bg-gray-300">
            <table className="w-full border-spacing-32">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="w-12 bg-gray-900 py-3 text-gray-100"
                  >
                    <span className="sr-only">Jobs</span>
                  </th>
                  {DAYS.map((day) => (
                    <th
                      key={day.key}
                      className={
                        day.key === highlightedDayKey
                          ? "border-l border-r bg-gray-900 py-3 text-gray-100"
                          : "bg-gray-900 py-3 text-gray-100"
                      }
                    >
                      {day.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {JOBS.map((job, jobIndex) => {
                  const necessaryJobStyle = getNecessaryJobStyle(job);

                  return (
                    <tr
                      key={job}
                      className={
                        necessaryJobStyle
                          ? necessaryJobStyle.lineBgClass
                          : job.includes("Flo")
                            ? "bg-[#f3f3f3]"
                            : ""
                      }
                    >
                      <td
                        className={[
                          "sticky left-0 font-bold",
                          necessaryJobStyle ? necessaryJobStyle.solidClass : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {job}
                      </td>

                      {DAYS.map((day) => {
                        const isHighlightedDay = day.key === highlightedDayKey;
                        const holiday = weeklyPublicHolidays[day.key] ?? null;
                        const isHoliday = Boolean(holiday);
                        const isFloJob = job.includes("Flo");
                        const initials =
                          weeklyAssignments[day.key][jobIndex] ?? "";
                        const isReassigned = Boolean(
                          weeklyReassignmentFlags[day.key]?.[jobIndex],
                        );
                        const className = [
                          isHighlightedDay
                            ? `${
                                necessaryJobStyle
                                  ? necessaryJobStyle.solidClass
                                  : isFloJob
                                    ? "bg-[#f3f3f3]"
                                    : ""
                              } border-l border-r border-gray-500`
                            : "",
                          !isHighlightedDay && necessaryJobStyle
                            ? necessaryJobStyle.lineBgClass
                            : "",
                          isHoliday ? "bg-gray-100/80" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <CalendarDroppableCell
                            key={day.key}
                            day={day.key}
                            jobIndex={jobIndex}
                            isEditMode={isEditMode}
                            isDisabled={isHoliday}
                            className={className}
                          >
                            {holiday ? (
                              <span
                                role="img"
                                aria-label={holiday.name}
                                title={holiday.name}
                                className="text-lg"
                              >
                                {holiday.icon}
                              </span>
                            ) : (
                              <CalendarDraggableInitials
                                day={day.key}
                                jobIndex={jobIndex}
                                initials={initials}
                                isEditMode={isEditMode}
                                className={
                                  isHighlightedDay && isReassigned
                                    ? "text-pink-700 pink-change-contrast"
                                    : ""
                                }
                              />
                            )}
                          </CalendarDroppableCell>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        </div>
      </div>

      <DragOverlay>
        {isEditMode && activeInitials ? (
          <div className={overlayClassName}>{activeInitials}</div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default CalendarWeekly;
