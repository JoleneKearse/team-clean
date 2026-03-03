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
import { BUILDINGS, JOBS, getNecessaryJobStyle } from "../constants/consts";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";
import type { DayKey } from "../types/types";

type DragAssignmentPayload = {
  source: "buildings";
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
    candidate.source !== "buildings" ||
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

type BuildingDraggableInitialsProps = {
  day: DayKey;
  jobIndex: number;
  initials: string;
};

function BuildingDraggableInitials({
  day,
  jobIndex,
  initials,
}: BuildingDraggableInitialsProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `buildings-drag-${day}-${jobIndex}`,
      data: {
        source: "buildings",
        day,
        jobIndex,
        initials,
      } as DragAssignmentPayload,
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
      className={initials ? "cursor-grab active:cursor-grabbing" : undefined}
      {...listeners}
      {...attributes}
    >
      {initials}
    </span>
  );
}

type BuildingDroppableCellProps = {
  day: DayKey;
  jobIndex: number;
  className: string;
  children: React.ReactNode;
};

function BuildingDroppableCell({
  day,
  jobIndex,
  className,
  children,
}: BuildingDroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `buildings-drop-${day}-${jobIndex}`,
    data: {
      day,
      jobIndex,
    } as DropPayload,
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

const Buildings = () => {
  const {
    selectedDay,
    buildingWeeklyAssignments,
    buildingReassignmentFlags,
    moveBuildingAssignment,
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
    const source = parseDragPayload(event.active.data.current);
    setActiveInitials(source?.initials ?? "");
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveInitials("");

    if (!event.over) return;

    const source = parseDragPayload(event.active.data.current);
    const target = parseDropPayload(event.over.data.current);
    if (!source || !target) return;
    if (source.day !== target.day) return;
    if (source.jobIndex === target.jobIndex) return;

    const sourceInitials =
      buildingWeeklyAssignments[source.day][source.jobIndex] ?? "";
    if (!sourceInitials) return;

    moveBuildingAssignment(source.day, source.jobIndex, target.jobIndex);
  };

  const onDragCancel = () => {
    setActiveInitials("");
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-linear-to-b from-gray-500 from-12% to-gray-200 to-12%">
        <h2 className="text-center font-bold text-gray-100">Buildings 🏗️</h2>

        <div className="mt-2 space-y-2">
          {BUILDINGS.map((building) => {
            const assignments = getBuildingAssignmentsForDay({
              day: selectedDay,
              jobs: JOBS,
              weeklyAssignments: buildingWeeklyAssignments,
              buildingJobs: building.jobIds,
            });
            const uniqueAssignedCleaners = new Set(
              assignments
                .map((assignment) => assignment.initials)
                .filter((initials) => initials !== ""),
            );
            const hasOnlyOneAssignedCleaner = uniqueAssignedCleaners.size === 1;

            return (
              <section key={building.key}>
                <h3
                  className={[
                    "font-semibold",
                    hasOnlyOneAssignedCleaner ? "text-pink-700" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {hasOnlyOneAssignedCleaner
                    ? `${building.label} needs another cleaner`
                    : building.label}
                </h3>
                <div className="mt-1 rounded-xl overflow-hidden border ">
                  <table className="w-full text-center border-collapse">
                    <tbody>
                      <tr>
                        {assignments.map((assignment) => {
                          const jobIndex = JOBS.indexOf(assignment.job);
                          const necessaryJobStyle = getNecessaryJobStyle(
                            assignment.job,
                          );
                          const isReassigned =
                            jobIndex >= 0 &&
                            Boolean(
                              buildingReassignmentFlags[selectedDay]?.[
                                jobIndex
                              ],
                            );

                          return (
                            <td
                              key={`${assignment.job}-job`}
                              className={[
                                "italic border border-gray-400 px-2 py-1",
                                necessaryJobStyle
                                  ? necessaryJobStyle.solidClass
                                  : "",
                                hasOnlyOneAssignedCleaner &&
                                assignment.initials === ""
                                  ? "text-pink-700"
                                  : "",
                                isReassigned ? "text-pink-700" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {assignment.job}
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        {assignments.map((assignment) => {
                          const jobIndex = JOBS.indexOf(assignment.job);
                          const necessaryJobStyle = getNecessaryJobStyle(
                            assignment.job,
                          );
                          const isReassigned =
                            jobIndex >= 0 &&
                            Boolean(
                              buildingReassignmentFlags[selectedDay]?.[
                                jobIndex
                              ],
                            );

                          return (
                            <BuildingDroppableCell
                              key={`${assignment.job}-cleaner`}
                              day={selectedDay}
                              jobIndex={jobIndex}
                              className={[
                                "border border-gray-400 px-2 py-1",
                                hasOnlyOneAssignedCleaner &&
                                assignment.initials === ""
                                  ? "bg-pink-100"
                                  : necessaryJobStyle
                                    ? necessaryJobStyle.lineBgClass
                                    : "bg-gray-100",
                                necessaryJobStyle
                                  ? necessaryJobStyle.textClass
                                  : "",
                                isReassigned ? "text-pink-700" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {jobIndex >= 0 ? (
                                <BuildingDraggableInitials
                                  day={selectedDay}
                                  jobIndex={jobIndex}
                                  initials={assignment.initials}
                                />
                              ) : (
                                assignment.initials
                              )}
                            </BuildingDroppableCell>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      </article>

      <DragOverlay>
        {activeInitials ? (
          <div className="rounded-md border border-gray-600 bg-gray-100 px-2 py-1 text-sm shadow-md opacity-95">
            {activeInitials}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Buildings;
