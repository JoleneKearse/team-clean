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
import {
  BUILDINGS,
  JOBS,
  getClosureLabelById,
  getNecessaryJobStyle,
} from "../constants/consts";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";
import type { ClosureId, DayKey } from "../types/types";
import aamjiwnaangImage from "../assets/aamjiwnaang.webp";

type BuildingSlotId = "default" | "annex-flo1";

type DragAssignmentPayload = {
  source: "buildings";
  day: DayKey;
  jobIndex: number;
  initials: string;
  slotId: BuildingSlotId;
};

type DropPayload = {
  day: DayKey;
  jobIndex: number;
  slotId: BuildingSlotId;
};

function isBuildingSlotId(value: unknown): value is BuildingSlotId {
  return value === "default" || value === "annex-flo1";
}

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
    typeof candidate.initials !== "string" ||
    !isBuildingSlotId(candidate.slotId)
  ) {
    return null;
  }

  return {
    source: candidate.source,
    day: candidate.day,
    jobIndex,
    initials: candidate.initials,
    slotId: candidate.slotId,
  };
}

function parseDropPayload(payload: unknown): DropPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as Partial<DropPayload>;
  const jobIndex = candidate.jobIndex;

  if (
    !isDayKey(candidate.day) ||
    typeof jobIndex !== "number" ||
    !Number.isInteger(jobIndex) ||
    !isBuildingSlotId(candidate.slotId)
  ) {
    return null;
  }

  return {
    day: candidate.day,
    jobIndex,
    slotId: candidate.slotId,
  };
}

type BuildingDraggableInitialsProps = {
  day: DayKey;
  jobIndex: number;
  initials: string;
  isEditMode: boolean;
  slotId: BuildingSlotId;
};

function BuildingDraggableInitials({
  day,
  jobIndex,
  initials,
  isEditMode,
  slotId,
}: BuildingDraggableInitialsProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `buildings-drag-${day}-${slotId}-${jobIndex}`,
      data: {
        source: "buildings",
        day,
        jobIndex,
        initials,
        slotId,
      } as DragAssignmentPayload,
      disabled: !initials || !isEditMode,
    });

  return (
    <span
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.35 : 1,
        touchAction: isEditMode ? "none" : "auto",
      }}
      className={
        initials && isEditMode
          ? "cursor-grab active:cursor-grabbing"
          : undefined
      }
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
  isEditMode: boolean;
  className: string;
  slotId: BuildingSlotId;
  children: React.ReactNode;
};

function BuildingDroppableCell({
  day,
  jobIndex,
  isEditMode,
  className,
  slotId,
  children,
}: BuildingDroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `buildings-drop-${day}-${slotId}-${jobIndex}`,
    data: {
      day,
      jobIndex,
      slotId,
    } as DropPayload,
    disabled: !isEditMode,
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

type BuildingsProps = {
  isEditMode: boolean;
  closedItems: ClosureId[];
};

const ITALIC_BUILDING_SEGMENT_IDS = new Set<ClosureId>([
  "Education",
  "Drop-in Center",
]);

function renderBuildingLabel(
  segmentIds: readonly ClosureId[],
  options: { hasOnlyOneAssignedCleaner: boolean },
) {
  const { hasOnlyOneAssignedCleaner } = options;

  return segmentIds.map((segmentId, index) => (
    <span key={`${segmentId}-${index}`}>
      {index > 0 ? " / " : ""}
      <span
        className={[
          ITALIC_BUILDING_SEGMENT_IDS.has(segmentId) ? "italic" : "",
          ITALIC_BUILDING_SEGMENT_IDS.has(segmentId) &&
          !hasOnlyOneAssignedCleaner
            ? "text-sky-700"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {getClosureLabelById(segmentId)}
      </span>
    </span>
  ));
}

const Buildings = ({ isEditMode, closedItems }: BuildingsProps) => {
  const {
    currentDay,
    buildingWeeklyAssignments,
    buildingReassignmentFlags,
    moveBuildingAssignment,
    flo1AtAnnex,
    setFlo1AtAnnexForDay,
    isMarchBreakReducedScheduleDay,
  } = useSchedule();
  const [activeInitials, setActiveInitials] = useState("");
  const flo1JobIndex = JOBS.indexOf("Flo1");
  const flo1Initials =
    flo1JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo1JobIndex] ?? "")
      : "";
  const closedSet = new Set(closedItems);
  const marchBreakHiddenSegmentIds = isMarchBreakReducedScheduleDay
    ? new Set<ClosureId>(["Grade 1", "Grade 2"])
    : new Set<ClosureId>();
  const visibleBuildings = BUILDINGS.flatMap((building) => {
    const visibleSegmentIds = building.closureSegmentIds.filter(
      (segmentId) =>
        !closedSet.has(segmentId) && !marchBreakHiddenSegmentIds.has(segmentId),
    );

    if (visibleSegmentIds.length === 0) {
      return [];
    }

    return [{ building, visibleSegmentIds }];
  });

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

  if (visibleBuildings.length === 0) {
    return null;
  }

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
    const isSourceAnnexSlot = source.slotId === "annex-flo1";
    const isTargetAnnexSlot = target.slotId === "annex-flo1";

    if (isSourceAnnexSlot || isTargetAnnexSlot) {
      if (flo1JobIndex < 0) return;
      if (
        source.jobIndex !== flo1JobIndex ||
        target.jobIndex !== flo1JobIndex
      ) {
        return;
      }

      if (isTargetAnnexSlot && !isSourceAnnexSlot) {
        setFlo1AtAnnexForDay(source.day, true);
      } else if (isSourceAnnexSlot && !isTargetAnnexSlot) {
        setFlo1AtAnnexForDay(source.day, false);
      }

      return;
    }

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
      <div className="relative w-full">
        <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
          <h2 className="relative rounded-t-xl bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
            <img
              src={aamjiwnaangImage}
              alt="aamjiwnaang"
              aria-hidden="true"
              className="pointer-events-none absolute -left-3 top-7 h-18 w-18 -translate-y-1/2 rounded-full border-2 border-gray-700 object-cover"
            />
            Buildings
          </h2>

          <div className="space-y-2 p-4">
            {visibleBuildings.map(({ building, visibleSegmentIds }) => {
              const baseAssignments = getBuildingAssignmentsForDay({
                day: currentDay,
                jobs: JOBS,
                weeklyAssignments: buildingWeeklyAssignments,
                buildingJobs: building.jobIds,
              });
              const assignments = [
                ...baseAssignments.map((assignment) => ({
                  ...assignment,
                  initials:
                    building.key === "grade2_social" &&
                    assignment.job === "Flo1" &&
                    flo1JobIndex >= 0
                      ? flo1AtAnnex
                        ? ""
                        : flo1Initials
                      : assignment.initials,
                  slotId: "default" as const,
                })),
                ...(building.key === "grade1_annex" && flo1JobIndex >= 0
                  ? [
                      {
                        job: "Flo1" as const,
                        initials: flo1AtAnnex ? flo1Initials : "",
                        missing: false,
                        slotId: "annex-flo1" as const,
                      },
                    ]
                  : []),
              ];
              const uniqueAssignedCleaners = new Set(
                assignments
                  .map((assignment) => assignment.initials)
                  .filter((initials) => initials !== ""),
              );
              const hasOnlyOneAssignedCleaner =
                uniqueAssignedCleaners.size === 1;

              return (
                <section key={building.key}>
                  <h3
                    className={[
                      "font-semibold text-gray-900",
                      hasOnlyOneAssignedCleaner ? "text-pink-700" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {renderBuildingLabel(visibleSegmentIds, {
                      hasOnlyOneAssignedCleaner,
                    })}
                    {hasOnlyOneAssignedCleaner ? " needs another cleaner" : ""}
                  </h3>
                  <div className="mt-1 rounded-xl overflow-hidden border ">
                    <table className="w-full table-fixed text-center border-collapse">
                      <tbody>
                        <tr>
                          {assignments.map((assignment) => {
                            const jobIndex = JOBS.indexOf(assignment.job);
                            const jobLabel =
                              assignment.slotId === "annex-flo1"
                                ? ""
                                : assignment.job;
                            const necessaryJobStyle = getNecessaryJobStyle(
                              assignment.job,
                            );
                            const isReassigned =
                              jobIndex >= 0 &&
                              Boolean(
                                buildingReassignmentFlags[currentDay]?.[
                                  jobIndex
                                ],
                              );

                            return (
                              <td
                                key={`${assignment.job}-${assignment.slotId}-job`}
                                className={[
                                  "min-w-20 italic border border-gray-400 px-2 py-1",
                                  necessaryJobStyle
                                    ? necessaryJobStyle.solidClass
                                    : "",
                                  hasOnlyOneAssignedCleaner &&
                                  assignment.initials === ""
                                    ? "text-pink-700"
                                    : "",
                                  isReassigned
                                    ? "text-pink-700 pink-change-contrast"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {jobLabel}
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
                                buildingReassignmentFlags[currentDay]?.[
                                  jobIndex
                                ],
                              );

                            return (
                              <BuildingDroppableCell
                                key={`${assignment.job}-${assignment.slotId}-cleaner`}
                                day={currentDay}
                                jobIndex={jobIndex}
                                slotId={assignment.slotId}
                                isEditMode={isEditMode}
                                className={[
                                  "min-w-20 border border-gray-400 px-2 py-1",
                                  hasOnlyOneAssignedCleaner &&
                                  assignment.initials === ""
                                    ? "bg-pink-100"
                                    : necessaryJobStyle
                                      ? necessaryJobStyle.lineBgClass
                                      : "bg-gray-100",
                                  necessaryJobStyle
                                    ? necessaryJobStyle.textClass
                                    : "",
                                  isReassigned
                                    ? "text-pink-700 pink-change-contrast"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                {jobIndex >= 0 ? (
                                  <BuildingDraggableInitials
                                    day={currentDay}
                                    jobIndex={jobIndex}
                                    initials={assignment.initials}
                                    isEditMode={isEditMode}
                                    slotId={assignment.slotId}
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
      </div>

      <DragOverlay>
        {isEditMode && activeInitials ? (
          <div className="rounded-md border border-gray-600 bg-gray-100 px-2 py-1 text-sm shadow-md opacity-95">
            {activeInitials}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default Buildings;
