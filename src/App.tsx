import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useSchedule } from "./context/ScheduleContext";

import {
  CALL_IN_CLEANERS,
  CLEANERS,
  JOBS,
  STAFF_CLEANERS,
} from "./constants/consts";

import {
  EDITABLE_SECTION_IDS,
  type CleanerId,
  type ClosureId,
  type EditableSectionId,
  type JobId,
} from "./types/types";
import { getCleanerInitialsBadgeClassName } from "./utils/cleanerBadgeUtils";

import Calendar from "./components/Calendar";
import DailyAssignments from "./components/DailyAssignments";
import Buildings from "./components/Buildings";
import Daycare from "./components/Daycare";
import BandOffice from "./components/BandOffice";
import HealthCenter from "./components/HealthCenter";
import CommunityCenter from "./components/CommunityCenter";
import Seniors from "./components/Seniors";
import Grade1 from "./components/Grade1";
import Grade2 from "./components/Grade2";
import Education from "./components/Education";
import Fieldhouse from "./components/Fieldhouse";
import Social from "./components/Social";
import Annex from "./components/Annex";
import Church from "./components/Church";
import SignOffMessage from "./components/SignOffMessage";
import Button from "./components/Button";
import Closures from "./components/Closures";

const CALL_IN_CLEANER_SET = new Set<CleanerId>(CALL_IN_CLEANERS);
const HOLD_TO_EDIT_DELAY_MS = 1000;
const EASTERN_TIME_ZONE = "America/Toronto";
const DEFAULT_ORDER_CLOSED_ITEMS: readonly ClosureId[] = [
  "Community Center",
  "Church",
];

type EditableSectionEntry = {
  id: EditableSectionId;
  label: string;
  content: ReactNode;
};

type OutCleanerAssignment = {
  initials: CleanerId;
  jobId: JobId | null;
  replacementInitials: CleanerId | null;
  replacementJobId: JobId | null;
  hasReassignedReplacement: boolean;
  isCallInReplacement: boolean;
};

const EDITABLE_SECTION_LABELS: Record<EditableSectionId, string> = {
  seniors: "Seniors",
  grade1: "Grade 1",
  grade2: "Grade 2",
  education: "Education",
  fieldhouse: "Fieldhouse",
  social: "Social",
  annex: "Annex",
  buildings: "Buildings",
  daycare: "Daycare",
  bandOffice: "Band Office",
  healthCenter: "Health Center",
};

function isEditableSectionId(value: unknown): value is EditableSectionId {
  return EDITABLE_SECTION_IDS.includes(value as EditableSectionId);
}

function createEditableSectionEntry(
  id: EditableSectionId,
  content: ReactNode,
): EditableSectionEntry {
  return {
    id,
    label: EDITABLE_SECTION_LABELS[id],
    content,
  };
}

function reorderSectionOrder(
  currentOrder: readonly EditableSectionId[],
  activeId: EditableSectionId,
  overId: EditableSectionId,
) {
  const activeIndex = currentOrder.indexOf(activeId);
  const overIndex = currentOrder.indexOf(overId);

  if (activeIndex < 0 || overIndex < 0 || activeIndex === overIndex) {
    return [...currentOrder];
  }

  const nextOrder = [...currentOrder];
  const [movedSection] = nextOrder.splice(activeIndex, 1);

  nextOrder.splice(overIndex, 0, movedSection);

  return nextOrder;
}

type EditableSectionCardProps = {
  id: EditableSectionId;
  label: string;
  isEditMode: boolean;
  children: ReactNode;
};

function EditableSectionCard({
  id,
  label,
  isEditMode,
  children,
}: EditableSectionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id,
    disabled: !isEditMode,
  });
  const { setNodeRef: setDroppableNodeRef, isOver } = useDroppable({
    id,
    disabled: !isEditMode,
  });

  const setNodeRef = (node: HTMLDivElement | null) => {
    setDraggableNodeRef(node);
    setDroppableNodeRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
      className={[
        "relative transition-transform",
        isEditMode && isOver && !isDragging
          ? "rounded-2xl ring-4 ring-pink-300/80 ring-offset-2 ring-offset-pink-100"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {isEditMode && (
        <button
          type="button"
          aria-label={`Move ${label}`}
          className="absolute top-3 right-3 z-10 rounded-full bg-gray-700/95 px-3 py-1 text-xs font-semibold tracking-wide text-gray-100 shadow-lg"
          style={{ touchAction: "none" }}
          {...listeners}
          {...attributes}
        >
          Move
        </button>
      )}
      {children}
    </div>
  );
}

function getEasternTimeParts(referenceDate: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(referenceDate);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return {
    minutesSinceMidnight:
      Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : 0,
  };
}

function getTimeBasedSectionVisibility(referenceDate: Date) {
  const { minutesSinceMidnight } = getEasternTimeParts(referenceDate);

  return {
    showBuildings: minutesSinceMidnight < 18 * 60,
    showDaycare: minutesSinceMidnight < 20 * 60 + 30,
    showBandOffice: minutesSinceMidnight < 21 * 60 + 45,
  };
}

function hasDefaultOrderClosures(closedItems: readonly ClosureId[]) {
  if (closedItems.length !== DEFAULT_ORDER_CLOSED_ITEMS.length) {
    return false;
  }

  const closedItemSet = new Set(closedItems);

  return DEFAULT_ORDER_CLOSED_ITEMS.every((closureId) =>
    closedItemSet.has(closureId),
  );
}

type OutCleanerAssignmentsListProps = {
  assignments: readonly OutCleanerAssignment[];
};

function OutCleanerAssignmentsList({
  assignments,
}: OutCleanerAssignmentsListProps) {
  return (
    <div className="space-y-2">
      {assignments.map(
        ({
          initials,
          jobId,
          replacementInitials,
          replacementJobId,
          hasReassignedReplacement,
          isCallInReplacement,
        }) => (
          <p
            key={initials}
            className="flex flex-wrap items-center gap-2 border-b-2 border-gray-100/60 pb-2 last:border-b-0 last:pb-0"
          >
            {jobId &&
            replacementInitials &&
            (hasReassignedReplacement || isCallInReplacement) ? (
              <>
                {replacementJobId || jobId ? (
                  <span
                    className={getCleanerInitialsBadgeClassName(
                      replacementJobId ?? jobId,
                    )}
                  >
                    {replacementInitials}
                  </span>
                ) : (
                  <span className="font-semibold">{replacementInitials}</span>
                )}
                {replacementJobId && replacementJobId !== jobId ? (
                  <span>
                    ( <span className="font-semibold">{replacementJobId}</span>{" "}
                    ) replaces
                  </span>
                ) : (
                  <span>replaces</span>
                )}
                <span
                  className={getCleanerInitialsBadgeClassName(
                    jobId,
                    "line-through decoration-2",
                  )}
                >
                  {initials}
                </span>
                <span>
                  as <span className="font-semibold">{jobId}</span>.
                </span>
              </>
            ) : jobId ? (
              <>
                <span
                  className={getCleanerInitialsBadgeClassName(
                    jobId,
                    "line-through decoration-2",
                  )}
                >
                  {initials}
                </span>
                <span>
                  is out as <span className="font-semibold">{jobId}</span>.
                </span>
              </>
            ) : (
              <span className="font-semibold">{initials} is out.</span>
            )}
          </p>
        ),
      )}
    </div>
  );
}

function App() {
  const {
    currentDay,
    isViewingPastDate,
    isMarchBreakReducedScheduleDay,
    weeklyPublicHolidays,
    weeklyExtraHolidays,
    closedItems,
    peopleIn,
    presentCleaners,
    weeklyAssignments,
    referenceWeeklyAssignments,
    setPresentCleaners,
    sectionOrder,
    setSectionOrderForDay,
    isFridayized,
    setFridayizedForDay,
    saveScheduleToFirestore,
    isSavingSchedule,
    saveScheduleError,
    resetScheduleState,
  } = useSchedule();
  const [calendarView, setCalendarView] = useState<"weekly" | "monthly">(
    "weekly",
  );
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isClosuresOpen, setIsClosuresOpen] = useState(false);
  const [showSaveSuccessMessage, setShowSaveSuccessMessage] = useState(false);
  const [saveSuccessMessageTick, setSaveSuccessMessageTick] = useState(0);
  const [isHoldToEditPending, setIsHoldToEditPending] = useState(false);
  const [activeSectionId, setActiveSectionId] =
    useState<EditableSectionId | null>(null);
  const holdToEditTimeoutRef = useRef<number | null>(null);

  const triggerSaveSuccessMessage = () => {
    setShowSaveSuccessMessage(true);
    setSaveSuccessMessageTick((current) => current + 1);
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick(Date.now());
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!showSaveSuccessMessage) return;

    const timeoutId = window.setTimeout(() => {
      setShowSaveSuccessMessage(false);
    }, 5000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showSaveSuccessMessage, saveSuccessMessageTick]);

  useEffect(() => {
    return () => {
      if (holdToEditTimeoutRef.current !== null) {
        window.clearTimeout(holdToEditTimeoutRef.current);
      }
    };
  }, []);

  const closedItemSet = useMemo(() => new Set(closedItems), [closedItems]);
  const timeBasedVisibility = useMemo(
    () => getTimeBasedSectionVisibility(new Date(clockTick)),
    [clockTick],
  );
  const isMondayToThursdayDay =
    currentDay === "mon" ||
    currentDay === "tue" ||
    currentDay === "wed" ||
    currentDay === "thu";
  const hasDefaultClosures = useMemo(
    () => hasDefaultOrderClosures(closedItems),
    [closedItems],
  );
  const shouldApplyTimeVisibility = isMondayToThursdayDay && hasDefaultClosures;
  const isPastBuildingsVisibilityTime =
    shouldApplyTimeVisibility && !timeBasedVisibility.showBuildings;
  const isPastDaycareVisibilityTime =
    shouldApplyTimeVisibility && !timeBasedVisibility.showDaycare;
  const isPastBandOfficeVisibilityTime =
    shouldApplyTimeVisibility && !timeBasedVisibility.showBandOffice;
  const effectiveIsEditMode = isEditMode && !isViewingPastDate;
  const isEditUiActive = !isViewingPastDate && (isEditMode || isClosuresOpen);
  const isFriday = currentDay === "fri";
  const isCurrentDayHoliday = Boolean(
    weeklyPublicHolidays[currentDay] ?? weeklyExtraHolidays[currentDay],
  );
  const isFridayMarchBreak = isFriday && isMarchBreakReducedScheduleDay;
  const isThursday = currentDay === "thu";
  const isFridayHoliday = Boolean(
    weeklyPublicHolidays.fri ?? weeklyExtraHolidays.fri,
  );
  const showFridayizeButton =
    effectiveIsEditMode && isThursday && isFridayHoliday && !isViewingPastDate;
  const isFridayizedThursday = isThursday && isFridayHoliday && isFridayized;
  const isFridayOrMarchBreak =
    isFriday || isMarchBreakReducedScheduleDay || isFridayizedThursday;
  const isBuildingsComponentEnabled = !isFridayOrMarchBreak;
  const isSeniorsComponentEnabled = isFridayOrMarchBreak;
  const isGrade1ComponentEnabled =
    (isFriday || isFridayizedThursday) && !isMarchBreakReducedScheduleDay;
  const isGrade2ComponentEnabled =
    (isFriday || isFridayizedThursday) && !isMarchBreakReducedScheduleDay;
  const isEducationComponentEnabled = isFridayOrMarchBreak;
  const isFieldhouseComponentEnabled = isFridayOrMarchBreak;
  const isSocialComponentEnabled = isFridayOrMarchBreak;
  const isAnnexComponentEnabled = isFridayOrMarchBreak;
  const showDaycareSection = !closedItemSet.has("Daycare");
  const showBandOfficeSection = !closedItemSet.has("Band Office");
  const showHealthCenterSection = !closedItemSet.has("Health Center");
  const showCommunityCenterSection = !closedItemSet.has("Community Center");
  const showSeniorsSection =
    isSeniorsComponentEnabled && !closedItemSet.has("Seniors");
  const showGrade1Section =
    isGrade1ComponentEnabled && !closedItemSet.has("Grade 1");
  const showGrade2Section =
    isGrade2ComponentEnabled && !closedItemSet.has("Grade 2");
  const showEducationSection =
    isEducationComponentEnabled && !closedItemSet.has("Education");
  const showFieldhouseSection =
    isFieldhouseComponentEnabled && !closedItemSet.has("Fieldhouse");
  const showSocialSection =
    isSocialComponentEnabled && !closedItemSet.has("Social");
  const showAnnexSection =
    isAnnexComponentEnabled && !closedItemSet.has("Annex");
  const showBuildingsSection = isBuildingsComponentEnabled;
  const showChurchSection = !closedItemSet.has("Church");
  const sectionSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    }),
  );
  const editableSectionListClassName = isFriday ? "space-y-6" : "space-y-4";

  const preSignOffSectionsById = useMemo(() => {
    const sections: Partial<Record<EditableSectionId, EditableSectionEntry>> =
      {};

    if (!isCurrentDayHoliday && showSeniorsSection) {
      sections.seniors = createEditableSectionEntry("seniors", <Seniors />);
    }

    if (!isCurrentDayHoliday && showGrade1Section) {
      sections.grade1 = createEditableSectionEntry("grade1", <Grade1 />);
    }

    if (!isCurrentDayHoliday && showGrade2Section) {
      sections.grade2 = createEditableSectionEntry("grade2", <Grade2 />);
    }

    if (!isCurrentDayHoliday && showEducationSection) {
      sections.education = createEditableSectionEntry(
        "education",
        <Education />,
      );
    }

    if (!isCurrentDayHoliday && showFieldhouseSection) {
      sections.fieldhouse = createEditableSectionEntry(
        "fieldhouse",
        <Fieldhouse />,
      );
    }

    if (!isCurrentDayHoliday && showSocialSection) {
      sections.social = createEditableSectionEntry("social", <Social />);
    }

    if (!isCurrentDayHoliday && showAnnexSection) {
      sections.annex = createEditableSectionEntry("annex", <Annex />);
    }

    if (
      !isCurrentDayHoliday &&
      showBuildingsSection &&
      !isPastBuildingsVisibilityTime
    ) {
      sections.buildings = createEditableSectionEntry(
        "buildings",
        <Buildings
          isEditMode={effectiveIsEditMode}
          closedItems={closedItems}
        />,
      );
    }

    if (
      !isCurrentDayHoliday &&
      showDaycareSection &&
      !isPastDaycareVisibilityTime
    ) {
      sections.daycare = createEditableSectionEntry(
        "daycare",
        <Daycare isEditMode={effectiveIsEditMode} />,
      );
    }

    if (
      !isCurrentDayHoliday &&
      showBandOfficeSection &&
      !isPastBandOfficeVisibilityTime
    ) {
      sections.bandOffice = createEditableSectionEntry(
        "bandOffice",
        <BandOffice />,
      );
    }

    if (!isCurrentDayHoliday && showHealthCenterSection) {
      sections.healthCenter = createEditableSectionEntry(
        "healthCenter",
        <HealthCenter />,
      );
    }

    return sections;
  }, [
    closedItems,
    effectiveIsEditMode,
    isCurrentDayHoliday,
    isPastBandOfficeVisibilityTime,
    isPastBuildingsVisibilityTime,
    isPastDaycareVisibilityTime,
    showAnnexSection,
    showBandOfficeSection,
    showBuildingsSection,
    showDaycareSection,
    showEducationSection,
    showFieldhouseSection,
    showGrade1Section,
    showGrade2Section,
    showHealthCenterSection,
    showSeniorsSection,
    showSocialSection,
  ]);

  const deferredSectionsById = useMemo(() => {
    const sections: Partial<Record<EditableSectionId, EditableSectionEntry>> =
      {};

    if (
      !isCurrentDayHoliday &&
      showBuildingsSection &&
      isPastBuildingsVisibilityTime
    ) {
      sections.buildings = createEditableSectionEntry(
        "buildings",
        <Buildings
          isEditMode={effectiveIsEditMode}
          closedItems={closedItems}
        />,
      );
    }

    if (
      !isCurrentDayHoliday &&
      showDaycareSection &&
      isPastDaycareVisibilityTime
    ) {
      sections.daycare = createEditableSectionEntry(
        "daycare",
        <Daycare isEditMode={effectiveIsEditMode} />,
      );
    }

    if (
      !isCurrentDayHoliday &&
      showBandOfficeSection &&
      isPastBandOfficeVisibilityTime
    ) {
      sections.bandOffice = createEditableSectionEntry(
        "bandOffice",
        <BandOffice />,
      );
    }

    return sections;
  }, [
    closedItems,
    effectiveIsEditMode,
    isCurrentDayHoliday,
    isPastBandOfficeVisibilityTime,
    isPastBuildingsVisibilityTime,
    isPastDaycareVisibilityTime,
    showBandOfficeSection,
    showBuildingsSection,
    showDaycareSection,
  ]);

  const orderedPreSignOffSections = useMemo(() => {
    return sectionOrder.flatMap((sectionId) => {
      const section = preSignOffSectionsById[sectionId];

      return section ? [section] : [];
    });
  }, [preSignOffSectionsById, sectionOrder]);

  const orderedDeferredSections = useMemo(() => {
    return sectionOrder.flatMap((sectionId) => {
      const section = deferredSectionsById[sectionId];

      return section ? [section] : [];
    });
  }, [deferredSectionsById, sectionOrder]);

  const activeSectionLabel = activeSectionId
    ? EDITABLE_SECTION_LABELS[activeSectionId]
    : "";

  const toggleCleaner = (cleaner: CleanerId) => {
    if (isViewingPastDate) return;

    setIsEditMode(true);

    setPresentCleaners((current) =>
      current.includes(cleaner)
        ? current.filter((initials) => initials !== cleaner)
        : CLEANERS.filter((initials) =>
            [...current, cleaner].includes(initials),
          ),
    );
  };

  const handleEditSchedule = () => {
    if (isViewingPastDate) {
      return;
    }

    if (isSavingSchedule) {
      return;
    }

    if (!isEditUiActive) {
      setIsEditMode(true);
      return;
    }

    void saveScheduleToFirestore()
      .then(() => {
        triggerSaveSuccessMessage();
        setIsEditMode(false);
      })
      .catch(() => {
        // Error is already tracked in context and shown in the UI.
      });
  };

  const handleResetSchedule = () => {
    if (isViewingPastDate) {
      return;
    }

    void resetScheduleState()
      .then(() => {
        triggerSaveSuccessMessage();
        setIsEditMode(false);
        setIsClosuresOpen(false);
      })
      .catch(() => {
        // Error is already tracked in context and shown in the UI.
      });
  };

  const handleToggleHelp = () => {
    setIsHelpOpen((current) => !current);
  };

  const handleToggleCalendarView = () => {
    setCalendarView((current) => (current === "weekly" ? "monthly" : "weekly"));
  };

  const handleToggleClosures = () => {
    if (isViewingPastDate) {
      return;
    }

    setIsClosuresOpen((current) => !current);
  };

  const handleToggleClosureItem = () => {
    if (isViewingPastDate) {
      return;
    }

    setIsEditMode(true);
  };

  const handleToggleFridayize = () => {
    if (isViewingPastDate || !isThursday || !isFridayHoliday) {
      return;
    }

    setFridayizedForDay(currentDay, !isFridayized);
  };

  const handleSectionDragStart = ({ active }: DragStartEvent) => {
    if (!effectiveIsEditMode || !isEditableSectionId(active.id)) {
      return;
    }

    setActiveSectionId(active.id);
  };

  const handleSectionDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveSectionId(null);

    if (!effectiveIsEditMode || !over) {
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    if (
      !isEditableSectionId(activeId) ||
      !isEditableSectionId(overId) ||
      activeId === overId
    ) {
      return;
    }

    setSectionOrderForDay(
      currentDay,
      reorderSectionOrder(sectionOrder, activeId, overId),
    );
  };

  const handleSectionDragCancel = () => {
    setActiveSectionId(null);
  };

  const clearHoldToEdit = () => {
    if (holdToEditTimeoutRef.current !== null) {
      window.clearTimeout(holdToEditTimeoutRef.current);
      holdToEditTimeoutRef.current = null;
    }

    setIsHoldToEditPending(false);
  };

  const handleHoldToEditStart = () => {
    if (isViewingPastDate || isEditUiActive || isSavingSchedule) {
      return;
    }

    clearHoldToEdit();
    setIsHoldToEditPending(true);

    holdToEditTimeoutRef.current = window.setTimeout(() => {
      setIsEditMode(true);
      setIsHoldToEditPending(false);
      holdToEditTimeoutRef.current = null;
    }, HOLD_TO_EDIT_DELAY_MS);
  };

  const handleHoldToEditEnd = () => {
    if (!isHoldToEditPending) {
      return;
    }

    clearHoldToEdit();
  };

  const editButtonLabel = isEditUiActive
    ? isSavingSchedule
      ? "Saving..."
      : "Confirm"
    : "Edit";

  const outCleanerAssignments = useMemo(() => {
    if (peopleIn >= 8) {
      return [] as OutCleanerAssignment[];
    }

    const dayAssignments = referenceWeeklyAssignments[currentDay] ?? [];
    const activeDayAssignments = weeklyAssignments[currentDay] ?? [];
    const presentCleanerSet = new Set(presentCleaners);

    return STAFF_CLEANERS.filter(
      (cleaner) => !presentCleanerSet.has(cleaner),
    ).map((cleaner) => {
      const jobIndex = dayAssignments.findIndex(
        (initials) => initials === cleaner,
      );
      const jobId = jobIndex >= 0 ? JOBS[jobIndex] : null;
      const replacementInitialsRaw =
        jobIndex >= 0 ? (activeDayAssignments[jobIndex] ?? "") : "";
      const replacementInitials =
        replacementInitialsRaw &&
        replacementInitialsRaw !== cleaner &&
        CLEANERS.includes(replacementInitialsRaw as CleanerId)
          ? (replacementInitialsRaw as CleanerId)
          : null;
      const replacementJobIndex = replacementInitials
        ? dayAssignments.findIndex(
            (initials) => initials === replacementInitials,
          )
        : -1;
      const replacementJobId =
        replacementJobIndex >= 0 ? JOBS[replacementJobIndex] : null;
      const hasReassignedReplacement = Boolean(
        replacementInitials &&
        jobId &&
        replacementJobId &&
        replacementJobId !== jobId,
      );
      const isCallInReplacement = Boolean(
        replacementInitials && CALL_IN_CLEANER_SET.has(replacementInitials),
      );

      return {
        initials: cleaner,
        jobId,
        replacementInitials,
        replacementJobId,
        hasReassignedReplacement,
        isCallInReplacement,
      };
    });
  }, [
    currentDay,
    peopleIn,
    presentCleaners,
    referenceWeeklyAssignments,
    weeklyAssignments,
  ]);

  return (
    <div className="mx-auto flex max-w-112.5 flex-col items-center gap-4 p-4">
      <div
        className={[
          "w-full rounded-xl transition-colors",
          isFriday ? "space-y-6" : "space-y-4",
          isEditUiActive ? "bg-pink-300/45 p-2" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section className="w-full overflow-hidden rounded-xl border border-gray-500 bg-gray-200 shadow-lg">
          <div className="flex items-center justify-between gap-4 bg-gray-700 px-4 py-4 text-gray-100">
            {isEditUiActive ? (
              <>
                <div>
                  <h2 className="font-semibold text-xl">Who is in today?</h2>
                  <p className="text-sm italic text-gray-200">
                    (Un)Check names if necessary
                  </p>
                </div>

                <span
                  className={[
                    "flex flex-col items-center justify-center text-center leading-none",
                    peopleIn === 8
                      ? "font-semibold"
                      : "font-bold text-pink-400",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="text-sm">Staffing:</span>
                  <span className="rainbow-accent-text white-text-outline text-5xl leading-none font-black">
                    {peopleIn}
                  </span>
                </span>
              </>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-base font-semibold tracking-wide text-gray-200">
                  Staffing
                </h2>
                <span
                  className={[
                    "rainbow-accent-text white-text-outline text-6xl leading-none font-black",
                    peopleIn === 8 ? "" : "scale-105",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {peopleIn}
                </span>
              </div>
            )}

            {!isEditUiActive && (
              <button
                type="button"
                onPointerDown={handleHoldToEditStart}
                onPointerUp={handleHoldToEditEnd}
                onPointerLeave={handleHoldToEditEnd}
                onPointerCancel={handleHoldToEditEnd}
                onContextMenu={(event) => event.preventDefault()}
                disabled={isSavingSchedule || isViewingPastDate}
                aria-label="Hold to edit"
                className={[
                  "flex min-h-11 items-center justify-center gap-3 rounded-lg bg-gray-100 px-4 py-2 text-gray-800 transition-colors select-none touch-none disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500",
                  isHoldToEditPending ? "bg-pink-200 text-pink-900" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="font-medium whitespace-nowrap">
                  {isHoldToEditPending ? "Keep holding..." : "Hold to Edit"}
                </span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                  />
                </svg>
              </button>
            )}
          </div>

          {isEditUiActive ? (
            <div className="p-4">
              <div className="mt-3 flex flex-wrap gap-3">
                {CLEANERS.map((cleaner) => {
                  const checked = presentCleaners.includes(cleaner);
                  const isCallInCleaner = CALL_IN_CLEANER_SET.has(cleaner);

                  return (
                    <label
                      key={cleaner}
                      className="inline-flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isViewingPastDate}
                        onChange={() => toggleCleaner(cleaner)}
                      />
                      <span className={isCallInCleaner ? "text-gray-600" : ""}>
                        {cleaner}
                      </span>
                    </label>
                  );
                })}
              </div>

              {peopleIn < 8 && (
                <div className="mt-3 rounded-lg border border-gray-300 bg-gray-300/60 p-3 text-pink-800">
                  <OutCleanerAssignmentsList
                    assignments={outCleanerAssignments}
                  />
                </div>
              )}

              {showFridayizeButton && (
                <div className="mt-3 flex justify-center">
                  <Button
                    label="FRIDAY-IZE IT!"
                    onClick={handleToggleFridayize}
                    disabled={isSavingSchedule}
                    className={isFridayized ? "text-pink-400" : ""}
                  />
                </div>
              )}
            </div>
          ) : null}
        </section>

        {isEditUiActive && (
          <div className="relative w-full">
            <div className="absolute -left-1 top-1/2 mt-1 -translate-y-1/2">
              <button
                type="button"
                onClick={handleToggleHelp}
                aria-label={isHelpOpen ? "Hide help" : "Show help"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="size-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                  />
                </svg>
              </button>
            </div>

            <div className="absolute -right-1 top-1/2 mt-1 -translate-y-1/2">
              <button
                type="button"
                onClick={handleToggleClosures}
                aria-label={isClosuresOpen ? "Hide closures" : "Show closures"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="size-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
                  />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-center gap-6 p-2">
              <Button
                label={editButtonLabel}
                onClick={handleEditSchedule}
                disabled={isSavingSchedule || isViewingPastDate}
                className={editButtonLabel === "Confirm" ? "text-pink-400" : ""}
                icon={
                  isEditUiActive ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      className="size-8"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                      />
                    </svg>
                  )
                }
              />
              <Button
                label="Reset"
                onClick={handleResetSchedule}
                disabled={isSavingSchedule || isViewingPastDate}
                icon={
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                    />
                  </svg>
                }
              />
            </div>
          </div>
        )}
        {saveScheduleError && (
          <p className="px-2 pb-1 text-center font-semibold text-pink-700">
            Save failed: {saveScheduleError}
          </p>
        )}
        {!saveScheduleError && showSaveSuccessMessage && (
          <p className="px-2 pb-1 text-center font-semibold text-pink-700">
            Changes sent to everyone.
          </p>
        )}
        {isViewingPastDate && (
          <p className="px-2 pb-1 text-center font-semibold text-pink-700">
            Viewing a past date. This view is read-only.
          </p>
        )}
        {!isViewingPastDate && isClosuresOpen && (
          <Closures onToggleItem={handleToggleClosureItem} />
        )}

        {isHelpOpen && (
          <div>
            <p>
              To change{" "}
              <b>{currentDay[0].toUpperCase() + currentDay.slice(1)}</b>{" "}
              calendar, <b>buildings</b>, or <b>daycare</b> assignments:
            </p>
            <ol className="mt-1 list-inside list-decimal space-y-1 pl-3">
              <li>
                Click the <b>Edit</b> button.
              </li>
              <li>
                Long-press the <b>initials</b> and drag to new job to reassign
                tasks. Initials will automatically swap.
              </li>
              <li>
                Click <b>Confirm</b> to save changes.
              </li>
            </ol>
            <p className="my-2">
              Click <b>Reset</b> to revert all changes to{" "}
              {currentDay[0].toUpperCase() + currentDay.slice(1)}'s defaults.
            </p>
          </div>
        )}

        <Calendar
          calendarView={calendarView}
          highlightedDayKey={currentDay}
          isEditMode={effectiveIsEditMode}
          onToggleCalendarView={handleToggleCalendarView}
        />
        {calendarView === "weekly" && !isEditUiActive && peopleIn < 8 && (
          <article className="w-full overflow-hidden rounded-xl border border-gray-500 bg-gray-200 shadow-lg">
            <div className="p-3 text-pink-800">
              <p className="pb-2 font-semibold">
                Assignment changes for today:
              </p>
              <OutCleanerAssignmentsList assignments={outCleanerAssignments} />
            </div>
          </article>
        )}
        {(calendarView === "monthly" || isCurrentDayHoliday) && (
          <DailyAssignments />
        )}
        {!isCurrentDayHoliday && orderedPreSignOffSections.length > 0 && (
          <div className={editableSectionListClassName}>
            {effectiveIsEditMode ? (
              <DndContext
                sensors={sectionSensors}
                collisionDetection={closestCenter}
                onDragStart={handleSectionDragStart}
                onDragEnd={handleSectionDragEnd}
                onDragCancel={handleSectionDragCancel}
              >
                <div className={editableSectionListClassName}>
                  {orderedPreSignOffSections.map((section) => (
                    <EditableSectionCard
                      key={section.id}
                      id={section.id}
                      label={section.label}
                      isEditMode={effectiveIsEditMode}
                    >
                      {section.content}
                    </EditableSectionCard>
                  ))}
                </div>
                <DragOverlay>
                  {activeSectionLabel ? (
                    <div className="w-80 max-w-full rounded-xl border border-pink-400 bg-white/95 px-4 py-3 shadow-2xl">
                      <p className="text-xs font-semibold tracking-wide text-pink-700">
                        Moving Section
                      </p>
                      <p className="text-lg font-bold text-gray-800">
                        {activeSectionLabel}
                      </p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            ) : (
              orderedPreSignOffSections.map((section) => (
                <div key={section.id}>{section.content}</div>
              ))
            )}
          </div>
        )}
      </div>
      {!isCurrentDayHoliday && <SignOffMessage />}
      {!isCurrentDayHoliday && (
        <div className="opacity-75">
          {orderedDeferredSections.map((section) => (
            <div
              key={section.id}
              className={
                effectiveIsEditMode &&
                (section.id === "buildings" || section.id === "daycare")
                  ? "rounded-xl bg-pink-300/45 p-2"
                  : ""
              }
            >
              {section.content}
            </div>
          ))}
          {!isFridayMarchBreak && showCommunityCenterSection && (
            <CommunityCenter />
          )}
          {!isFridayMarchBreak && showChurchSection && <Church />}
        </div>
      )}
    </div>
  );
}

export default App;
