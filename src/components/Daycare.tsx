import { useState } from "react";

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
import { JOBS, getNecessaryJobStyle } from "../constants/consts";
import type { DayKey } from "../types/types";

import {
  getDaycareJobLabel,
  getDayCareAssignmentsForDay,
  getMissingDayCareAreasForDay,
} from "../utils/scheduleUtils";

function formatMissingAreas(areas: string[]): string {
  if (areas.length === 0) return "";
  if (areas.length === 1) return areas[0];
  if (areas.length === 2) return `${areas[0]} & ${areas[1]}`;

  return `${areas.slice(0, -2).join(", ")}, ${areas[areas.length - 2]} & ${areas[areas.length - 1]}`;
}

type DaycareDragPayload = {
  source: "daycare";
  day: DayKey;
  jobIndex: number;
  initials: string;
};

type DaycareDropPayload = {
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

function parseDaycareDragPayload(payload: unknown): DaycareDragPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Partial<DaycareDragPayload>;
  const day = candidate.day;
  const jobIndex = candidate.jobIndex;

  if (
    candidate.source !== "daycare" ||
    !isDayKey(day) ||
    typeof jobIndex !== "number" ||
    !Number.isInteger(jobIndex) ||
    typeof candidate.initials !== "string"
  ) {
    return null;
  }

  return {
    source: candidate.source,
    day,
    jobIndex,
    initials: candidate.initials,
  };
}

function parseDaycareDropPayload(payload: unknown): DaycareDropPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Partial<DaycareDropPayload>;
  const day = candidate.day;
  const jobIndex = candidate.jobIndex;

  if (
    !isDayKey(day) ||
    typeof jobIndex !== "number" ||
    !Number.isInteger(jobIndex)
  ) {
    return null;
  }

  return {
    day,
    jobIndex,
  };
}

type DaycareDraggableBadgeProps = {
  day: DayKey;
  jobIndex: number;
  initials: string;
  className: string;
};

function DaycareDraggableBadge({
  day,
  jobIndex,
  initials,
  className,
}: DaycareDraggableBadgeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `daycare-drag-${day}-${jobIndex}`,
      data: {
        source: "daycare",
        day,
        jobIndex,
        initials,
      } as DaycareDragPayload,
      disabled: !initials,
    });

  return (
    <span
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.35 : 1,
        touchAction: "none",
      }}
      className={[
        className,
        initials ? "cursor-grab active:cursor-grabbing" : "",
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

type DaycareDroppableRowProps = {
  day: DayKey;
  jobIndex: number;
  className?: string;
  children: React.ReactNode;
};

function DaycareDroppableRow({
  day,
  jobIndex,
  className,
  children,
}: DaycareDroppableRowProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `daycare-drop-${day}-${jobIndex}`,
    data: {
      day,
      jobIndex,
    } as DaycareDropPayload,
  });

  return (
    <li
      ref={setNodeRef}
      className={[
        className ?? "",
        isOver ? "ring-2 ring-pink-400 rounded-sm" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </li>
  );
}

const Daycare = () => {
  const {
    selectedDay,
    daycareWeeklyAssignments,
    daycareReassignmentFlags,
    moveDaycareAssignment,
    peopleIn,
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
    const source = parseDaycareDragPayload(event.active.data.current);
    setActiveInitials(source?.initials ?? "");
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveInitials("");

    if (!event.over) return;

    const source = parseDaycareDragPayload(event.active.data.current);
    const target = parseDaycareDropPayload(event.over.data.current);
    if (!source || !target) return;
    if (source.day !== target.day) return;
    if (source.jobIndex === target.jobIndex) return;

    const sourceInitials =
      daycareWeeklyAssignments[source.day][source.jobIndex] ?? "";
    const targetInitials =
      daycareWeeklyAssignments[target.day][target.jobIndex] ?? "";

    if (!sourceInitials || !targetInitials) return;

    moveDaycareAssignment(source.day, source.jobIndex, target.jobIndex);
  };

  const onDragCancel = () => {
    setActiveInitials("");
  };

  const assignments = getDayCareAssignmentsForDay({
    day: selectedDay,
    jobs: JOBS,
    weeklyAssignments: daycareWeeklyAssignments,
    peopleIn,
  });
  // call attention to missing areas to reassign cleaners
  const missingAreas = getMissingDayCareAreasForDay({
    day: selectedDay,
    jobs: JOBS,
    weeklyAssignments: daycareWeeklyAssignments,
    peopleIn,
  });

  const missingAreasText = formatMissingAreas(missingAreas);

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-3xl leading-none"
        >
          🧸
        </span>
        Daycare
      </h2>

      <div className="p-4">
        {missingAreas.length > 0 && (
          <h3 className="font-semibold text-pink-700">
            {`${missingAreasText} ${missingAreas.length === 1 ? "needs" : "need"} to be assigned`}
          </h3>
        )}

        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <ul className="mt-3 space-y-1">
            {assignments
              .filter((assignment) => assignment.initials !== "")
              .map((assignment) => {
                const jobIndex = JOBS.indexOf(assignment.job);
                const isReassigned =
                  jobIndex >= 0 &&
                  Boolean(daycareReassignmentFlags[selectedDay]?.[jobIndex]);
                const baselineLabel = getDaycareJobLabel(assignment.job, 8);
                const isAreaChanged = assignment.label !== baselineLabel;
                const shouldHighlightLabel = isReassigned || isAreaChanged;
                const necessaryJobStyle = getNecessaryJobStyle(assignment.job);
                const badgeClassName = [
                  "inline-block rounded px-1 font-medium",
                  necessaryJobStyle ? necessaryJobStyle.badgeClass : "",
                  isReassigned ? "text-pink-700" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                if (jobIndex < 0) {
                  return (
                    <li key={assignment.job}>
                      <span className={badgeClassName}>
                        {assignment.initials}
                      </span>{" "}
                      <span
                        className={shouldHighlightLabel ? "text-pink-700" : ""}
                      >
                        {assignment.label}
                      </span>
                    </li>
                  );
                }

                return (
                  <DaycareDroppableRow
                    key={assignment.job}
                    day={selectedDay}
                    jobIndex={jobIndex}
                  >
                    <DaycareDraggableBadge
                      day={selectedDay}
                      jobIndex={jobIndex}
                      initials={assignment.initials}
                      className={badgeClassName}
                    />{" "}
                    <span
                      className={shouldHighlightLabel ? "text-pink-700" : ""}
                    >
                      {assignment.label}
                    </span>
                  </DaycareDroppableRow>
                );
              })}
          </ul>

          <DragOverlay>
            {activeInitials ? (
              <div className="rounded-md border border-gray-600 bg-gray-100 px-2 py-1 text-sm shadow-md opacity-95">
                {activeInitials}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </article>
  );
};

export default Daycare;
