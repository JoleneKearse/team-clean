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
import { getCleanerInitialsBadgeClassName } from "../utils/cleanerBadgeUtils";
import {
  JOBS,
  getClosureLabelById,
  getMopLocationsForDay,
  getNecessaryJobStyle,
} from "../constants/consts";
import type { ClosureId, DayKey } from "../types/types";
import aamjiwnaangImage from "../assets/aamjiwnaang.webp";
import mopIcon from "../assets/mop.svg";

type BuildingSlotId =
  | "seniors-sw"
  | "seniors-san"
  | "seniors-flo3"
  | "grade1-bath"
  | "grade1-flo2"
  | "grade1-flo1"
  | "grade2-vac"
  | "grade2-gar"
  | "social-vac"
  | "social-gar"
  | "social-flo1"
  | "annex-bath"
  | "annex-flo2"
  | "annex-flo1";

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
  return (
    value === "seniors-sw" ||
    value === "seniors-san" ||
    value === "seniors-flo3" ||
    value === "grade1-bath" ||
    value === "grade1-flo2" ||
    value === "grade1-flo1" ||
    value === "grade2-vac" ||
    value === "grade2-gar" ||
    value === "social-vac" ||
    value === "social-gar" ||
    value === "social-flo1" ||
    value === "annex-bath" ||
    value === "annex-flo2" ||
    value === "annex-flo1"
  );
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

const ITALIC_BUILDING_SEGMENT_IDS = new Set<ClosureId>(["Education"]);

type BuildingSection = {
  key: string;
  phase: 1 | 3;
  readOnly?: boolean;
  closureSegmentIds: readonly ClosureId[];
  slotDefinitions: readonly {
    slotId: BuildingSlotId;
    job: (typeof JOBS)[number];
    label: string;
  }[];
  containerClassName?: string;
};

const BUILDING_SECTIONS: readonly BuildingSection[] = [
  {
    key: "seniors_fieldhouse",
    phase: 1,
    closureSegmentIds: ["Seniors", "Fieldhouse"],
    slotDefinitions: [
      { slotId: "seniors-sw", job: "SW", label: "SW" },
      { slotId: "seniors-san", job: "San", label: "San" },
      { slotId: "seniors-flo3", job: "Flo3", label: "Flo3" },
    ],
  },
  {
    key: "grade1",
    phase: 1,
    closureSegmentIds: ["Grade 1"],
    slotDefinitions: [
      { slotId: "grade1-bath", job: "Bath", label: "Bath" },
      { slotId: "grade1-flo2", job: "Flo2", label: "Flo2" },
      { slotId: "grade1-flo1", job: "Flo1", label: "Flo1" },
    ],
  },
  {
    key: "grade2",
    phase: 1,
    closureSegmentIds: ["Grade 2"],
    slotDefinitions: [
      { slotId: "grade2-vac", job: "Vac", label: "Vac" },
      { slotId: "grade2-gar", job: "Gar", label: "Gar" },
    ],
    containerClassName: "w-2/3 min-w-52",
  },
  {
    key: "social",
    phase: 3,
    closureSegmentIds: ["Social"],
    slotDefinitions: [
      { slotId: "social-vac", job: "Vac", label: "Vac" },
      { slotId: "social-gar", job: "Gar", label: "Gar" },
      { slotId: "social-flo1", job: "Flo1", label: "Flo1" },
    ],
  },
  {
    key: "annex",
    phase: 3,
    closureSegmentIds: ["Annex"],
    slotDefinitions: [
      { slotId: "annex-bath", job: "Bath", label: "Bath" },
      { slotId: "annex-flo2", job: "Flo2", label: "Flo2" },
    ],
    containerClassName: "w-2/3 min-w-52",
  },
  {
    key: "fieldhouse_dropin_final",
    phase: 3,
    readOnly: true,
    closureSegmentIds: ["Drop-in Center"],
    slotDefinitions: [
      { slotId: "seniors-sw", job: "SW", label: "SW" },
      { slotId: "seniors-san", job: "San", label: "San" },
      { slotId: "seniors-flo3", job: "Flo3", label: "Flo3" },
    ],
  },
];

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
  const mopLocations = getMopLocationsForDay(currentDay);
  const isMoppingDay = mopLocations.length > 0;
  const isMoppingSeniors = mopLocations.includes("seniors");
  const isMoppingBackBuildings = mopLocations.includes("backBuildings");
  const [activeInitials, setActiveInitials] = useState("");
  const flo1JobIndex = JOBS.indexOf("Flo1");
  const flo1Initials =
    flo1JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo1JobIndex] ?? "")
      : "";
  const flo2JobIndex = JOBS.indexOf("Flo2");
  const flo2Initials =
    flo2JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo2JobIndex] ?? "")
      : "";
  const flo3JobIndex = JOBS.indexOf("Flo3");
  const flo3Initials =
    flo3JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo3JobIndex] ?? "")
      : "";
  const closedSet = new Set(closedItems);
  const marchBreakHiddenSegmentIds = isMarchBreakReducedScheduleDay
    ? new Set<ClosureId>(["Grade 1", "Grade 2"])
    : new Set<ClosureId>();
  const visibleSections = BUILDING_SECTIONS.flatMap((section) => {
    const visibleSegmentIds = section.closureSegmentIds.filter(
      (segmentId) =>
        !closedSet.has(segmentId) && !marchBreakHiddenSegmentIds.has(segmentId),
    );

    if (visibleSegmentIds.length === 0) {
      return [];
    }

    return [{ section, visibleSegmentIds }];
  });

  const isEducationVisible = !closedSet.has("Education");
  const sanJobIndex = JOBS.indexOf("San");
  const swJobIndex = JOBS.indexOf("SW");
  const bathJobIndex = JOBS.indexOf("Bath");
  const sanInitials =
    sanJobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][sanJobIndex] ?? "")
      : "";
  const swInitials =
    swJobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][swJobIndex] ?? "")
      : "";
  const bathInitials =
    bathJobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][bathJobIndex] ?? "")
      : "";

  const phase1Sections = visibleSections.filter(
    ({ section }) => section.phase === 1,
  );
  const phase3Sections = visibleSections.filter(
    ({ section }) => section.phase === 3,
  );

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

  if (
    phase1Sections.length === 0 &&
    !isEducationVisible &&
    phase3Sections.length === 0
  ) {
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

  function renderSectionContent(
    section: BuildingSection,
    visibleSegmentIds: readonly ClosureId[],
  ) {
    const assignments = section.slotDefinitions.map(
      ({ slotId, job, label }) => {
        const jobIndex = JOBS.indexOf(job);
        const assignedInitials =
          jobIndex >= 0
            ? (buildingWeeklyAssignments[currentDay][jobIndex] ?? "")
            : "";
        const initials =
          slotId === "annex-flo1"
            ? flo1AtAnnex
              ? flo1Initials
              : ""
            : job === "Flo1"
              ? flo1AtAnnex
                ? ""
                : assignedInitials
              : assignedInitials;

        return { slotId, job, label, jobIndex, initials };
      },
    );
    const uniqueAssignedCleaners = new Set(
      assignments
        .map((assignment) => assignment.initials)
        .filter((initials) => initials !== ""),
    );
    const hasOnlyOneAssignedCleaner = uniqueAssignedCleaners.size === 1;

    return (
      <section key={section.key}>
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
          {(isMoppingSeniors && section.key === "seniors_fieldhouse") ||
          (isMoppingBackBuildings &&
            section.key !== "seniors_fieldhouse" &&
            !section.readOnly) ? (
            <img
              src={mopIcon}
              alt="mop"
              aria-hidden="true"
              className="inline-block h-4 w-4 align-middle"
            />
          ) : null}
          {hasOnlyOneAssignedCleaner ? " needs another cleaner" : ""}
        </h3>
        <div
          className={[
            "mt-1 rounded-xl overflow-hidden border",
            section.containerClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <table className="w-full table-fixed text-center border-collapse">
            <tbody>
              <tr>
                {assignments.map((assignment) => {
                  const necessaryJobStyle = getNecessaryJobStyle(
                    assignment.job,
                  );
                  const isReassigned =
                    assignment.jobIndex >= 0 &&
                    Boolean(
                      buildingReassignmentFlags[currentDay]?.[
                        assignment.jobIndex
                      ],
                    );

                  return (
                    <td
                      key={`${assignment.job}-${assignment.slotId}-job`}
                      className={[
                        "min-w-20 italic border border-gray-400 px-2 py-1",
                        necessaryJobStyle ? necessaryJobStyle.solidClass : "",
                        hasOnlyOneAssignedCleaner && assignment.initials === ""
                          ? "text-pink-700"
                          : "",
                        isReassigned
                          ? "text-pink-700 pink-change-contrast"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {assignment.label}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {assignments.map((assignment) => {
                  const necessaryJobStyle = getNecessaryJobStyle(
                    assignment.job,
                  );
                  const isReassigned =
                    assignment.jobIndex >= 0 &&
                    Boolean(
                      buildingReassignmentFlags[currentDay]?.[
                        assignment.jobIndex
                      ],
                    );

                  if (section.readOnly) {
                    return (
                      <td
                        key={`${assignment.job}-${assignment.slotId}-cleaner`}
                        className={[
                          "min-w-20 border border-gray-400 px-2 py-1",
                          hasOnlyOneAssignedCleaner &&
                          assignment.initials === ""
                            ? "bg-pink-100"
                            : necessaryJobStyle
                              ? necessaryJobStyle.lineBgClass
                              : "bg-gray-100",
                          necessaryJobStyle ? necessaryJobStyle.textClass : "",
                          isReassigned
                            ? "text-pink-700 pink-change-contrast"
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {assignment.initials}
                      </td>
                    );
                  }

                  return (
                    <BuildingDroppableCell
                      key={`${assignment.job}-${assignment.slotId}-cleaner`}
                      day={currentDay}
                      jobIndex={assignment.jobIndex}
                      slotId={assignment.slotId}
                      isEditMode={isEditMode}
                      className={[
                        "min-w-20 border border-gray-400 px-2 py-1",
                        hasOnlyOneAssignedCleaner && assignment.initials === ""
                          ? "bg-pink-100"
                          : necessaryJobStyle
                            ? necessaryJobStyle.lineBgClass
                            : "bg-gray-100",
                        necessaryJobStyle ? necessaryJobStyle.textClass : "",
                        isReassigned
                          ? "text-pink-700 pink-change-contrast"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {assignment.jobIndex >= 0 ? (
                        <BuildingDraggableInitials
                          day={currentDay}
                          jobIndex={assignment.jobIndex}
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
  }

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
            Buildings{" "}
            {isMoppingDay ? (
              <img
                src={mopIcon}
                alt="mop"
                aria-hidden="true"
                className="inline-block h-5 w-5 align-middle"
              />
            ) : (
              ""
            )}
          </h2>
          {isMoppingDay && (
            <p className="border-b border-gray-300 px-4 py-2 text-center font-semibold text-sky-800">
              {isMoppingSeniors && isMoppingBackBuildings
                ? "Mop the Seniors and back buildings today."
                : isMoppingSeniors
                  ? "Mop the Seniors today."
                  : "Mop the back buildings today."}
            </p>
          )}

          <div className="space-y-2 p-4">
            {/* Phase 1: Start in Groups */}
            {phase1Sections.length > 0 && (
              <div className="rounded-xl border border-gray-300 bg-white p-3">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">Start in Groups</p>
                    <p className="text-sm text-gray-500">
                      Split into 3 groups.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {phase1Sections.map(({ section, visibleSegmentIds }) =>
                    renderSectionContent(section, visibleSegmentIds),
                  )}
                </div>
              </div>
            )}

            {phase1Sections.length > 0 && isEducationVisible && (
              <div className="pointer-events-none relative z-10 -mt-5 -mb-0.5 flex justify-center text-4xl font-black leading-none text-sky-700">
                ↓
              </div>
            )}

            {/* Phase 2: Education All Together */}
            {isEducationVisible && (
              <div className="rounded-xl border border-gray-300 bg-white p-3">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
                    2
                  </span>
                  <p className="font-bold text-gray-900">
                    Education All Together
                  </p>
                </div>
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
                  {flo1Initials && (
                    <span className={getCleanerInitialsBadgeClassName("Flo1")}>
                      {flo1Initials}
                    </span>
                  )}
                  {flo2Initials && (
                    <span className={getCleanerInitialsBadgeClassName("Flo2")}>
                      {flo2Initials}
                    </span>
                  )}
                  {flo3Initials && (
                    <span className={getCleanerInitialsBadgeClassName("Flo3")}>
                      {flo3Initials}
                    </span>
                  )}
                  <span>can help</span>
                  <span className={getCleanerInitialsBadgeClassName("San")}>
                    {sanInitials || "—"}
                  </span>
                  <span className={getCleanerInitialsBadgeClassName("SW")}>
                    {swInitials || "—"}
                  </span>
                  <span className={getCleanerInitialsBadgeClassName("Bath")}>
                    {bathInitials || "—"}
                  </span>
                </p>
              </div>
            )}

            {isEducationVisible && phase3Sections.length > 0 && (
              <div className="pointer-events-none relative z-10 -mt-5 -mb-0.5 flex justify-center text-4xl font-black leading-none text-sky-700">
                ↓
              </div>
            )}

            {/* Phase 3: Final Groups */}
            {phase3Sections.length > 0 && (
              <div className="rounded-xl border border-gray-300 bg-white p-3">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-700 text-sm font-bold text-white">
                    3
                  </span>
                  <div>
                    <p className="font-bold text-gray-900">Final Groups</p>
                    <p className="text-sm text-gray-500">
                      Split into 3 groups again.
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {phase3Sections.map(({ section, visibleSegmentIds }) =>
                    renderSectionContent(section, visibleSegmentIds),
                  )}
                </div>
              </div>
            )}
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
