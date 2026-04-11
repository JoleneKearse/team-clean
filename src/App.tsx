import { useEffect, useMemo, useRef, useState } from "react";

import { useSchedule } from "./context/ScheduleContext";

import {
  CALL_IN_CLEANERS,
  CLEANERS,
  JOBS,
  STAFF_CLEANERS,
} from "./constants/consts";

import type { CleanerId, ClosureId, JobId } from "./types/types";
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
import DropInCenter from "./components/DropInCenter";
import Church from "./components/Church";
import SignOffMessage from "./components/SignOffMessage";
import Button from "./components/Button";
import Closures from "./components/Closures";

const CALL_IN_CLEANER_SET = new Set<CleanerId>(CALL_IN_CLEANERS);
const HOLD_TO_EDIT_DELAY_MS = 1000;
const EASTERN_TIME_ZONE = "America/Toronto";
const DEFAULT_ORDER_CLOSED_ITEMS: readonly ClosureId[] = [
  "Community Center",
  "Drop-in Center",
  "Church",
];

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
  const isFridayOnly = isFriday && !isMarchBreakReducedScheduleDay;
  const isMarchBreakWeekday = isMarchBreakReducedScheduleDay && !isFriday;
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
  const showDropInCenterSection = !closedItemSet.has("Drop-in Center");
  const showChurchSection = !closedItemSet.has("Church");

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

  type OutCleanerAssignment = {
    initials: CleanerId;
    jobId: JobId | null;
    replacementInitials: CleanerId | null;
    replacementJobId: JobId | null;
    hasReassignedReplacement: boolean;
  };

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
        replacementInitialsRaw && replacementInitialsRaw !== cleaner
          ? replacementInitialsRaw
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

      return {
        initials: cleaner,
        jobId,
        replacementInitials,
        replacementJobId,
        hasReassignedReplacement,
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
                  <div className="space-y-2">
                    {outCleanerAssignments.map(
                      ({
                        initials,
                        jobId,
                        replacementInitials,
                        replacementJobId,
                        hasReassignedReplacement,
                      }) => (
                        <p
                          key={initials}
                          className="flex flex-wrap items-center gap-2 border-b-2 border-gray-100/60 pb-2 last:border-b-0 last:pb-0"
                        >
                          {jobId &&
                          hasReassignedReplacement &&
                          replacementInitials ? (
                            <>
                              {replacementJobId ? (
                                <span
                                  className={getCleanerInitialsBadgeClassName(
                                    replacementJobId,
                                  )}
                                >
                                  {replacementInitials}
                                </span>
                              ) : (
                                <span className="font-semibold">
                                  {replacementInitials}
                                </span>
                              )}
                              <span>
                                formerly{" "}
                                <span className="font-semibold">
                                  {replacementJobId}
                                </span>{" "}
                                replaces
                              </span>
                              <span
                                className={getCleanerInitialsBadgeClassName(
                                  jobId,
                                  "line-through decoration-2",
                                )}
                              >
                                {initials}
                              </span>
                              <span>
                                as{" "}
                                <span className="font-semibold">{jobId}</span>.
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
                                is out as{" "}
                                <span className="font-semibold">{jobId}</span>.
                              </span>
                            </>
                          ) : (
                            <span className="font-semibold">
                              {initials} is out.
                            </span>
                          )}
                        </p>
                      ),
                    )}
                  </div>
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
        {(calendarView === "monthly" || isCurrentDayHoliday) && (
          <DailyAssignments />
        )}
        {!isCurrentDayHoliday && (
          <>
            {isFridayMarchBreak && showSeniorsSection && <Seniors />}
            {isFridayMarchBreak && showEducationSection && <Education />}
            {isFridayMarchBreak && showFieldhouseSection && <Fieldhouse />}
            {isFridayMarchBreak && showSocialSection && <Social />}
            {isFridayMarchBreak && showAnnexSection && <Annex />}
            {(isFridayOnly || isFridayizedThursday) && showSeniorsSection && (
              <Seniors />
            )}
            {(isFridayOnly || isFridayizedThursday) && showGrade1Section && (
              <Grade1 />
            )}
            {(isFridayOnly || isFridayizedThursday) && showGrade2Section && (
              <Grade2 />
            )}
            {(isFridayOnly || isFridayizedThursday) && showEducationSection && (
              <Education />
            )}
            {(isFridayOnly || isFridayizedThursday) &&
              showFieldhouseSection && <Fieldhouse />}
            {(isFridayOnly || isFridayizedThursday) && showSocialSection && (
              <Social />
            )}
            {(isFridayOnly || isFridayizedThursday) && showAnnexSection && (
              <Annex />
            )}
            {isMarchBreakWeekday && showSeniorsSection && <Seniors />}
            {isMarchBreakWeekday && showEducationSection && <Education />}
            {isMarchBreakWeekday && showFieldhouseSection && <Fieldhouse />}
            {isMarchBreakWeekday && showSocialSection && <Social />}
            {isMarchBreakWeekday && showAnnexSection && <Annex />}
          </>
        )}
        {!isCurrentDayHoliday &&
          !isFriday &&
          !isFridayizedThursday &&
          !isMarchBreakReducedScheduleDay &&
          showSeniorsSection && <Seniors />}
        {!isCurrentDayHoliday &&
          !isFriday &&
          !isFridayizedThursday &&
          showGrade1Section && <Grade1 />}
        {!isCurrentDayHoliday &&
          !isFriday &&
          !isFridayizedThursday &&
          showGrade2Section && <Grade2 />}
        {!isCurrentDayHoliday &&
          !isFriday &&
          !isFridayizedThursday &&
          !isMarchBreakReducedScheduleDay &&
          showEducationSection && <Education />}
        {!isCurrentDayHoliday &&
          !isFriday &&
          !isFridayizedThursday &&
          !isMarchBreakReducedScheduleDay &&
          showFieldhouseSection && <Fieldhouse />}
        {!isCurrentDayHoliday &&
          !isFriday &&
          !isFridayizedThursday &&
          !isMarchBreakReducedScheduleDay &&
          showSocialSection && <Social />}
        {!isCurrentDayHoliday &&
          !isFriday &&
          !isFridayizedThursday &&
          !isMarchBreakReducedScheduleDay &&
          showAnnexSection && <Annex />}
        {!isCurrentDayHoliday &&
          showBuildingsSection &&
          !isPastBuildingsVisibilityTime && (
            <Buildings
              isEditMode={effectiveIsEditMode}
              closedItems={closedItems}
            />
          )}
        {!isCurrentDayHoliday &&
          showDaycareSection &&
          !isPastDaycareVisibilityTime && (
            <Daycare isEditMode={effectiveIsEditMode} />
          )}
      </div>
      {!isCurrentDayHoliday &&
        showBandOfficeSection &&
        !isPastBandOfficeVisibilityTime && <BandOffice />}
      {!isCurrentDayHoliday && showHealthCenterSection && <HealthCenter />}
      {!isCurrentDayHoliday && <SignOffMessage />}
      {!isCurrentDayHoliday && (
        <div className="opacity-75">
          {showBandOfficeSection && isPastBandOfficeVisibilityTime && (
            <BandOffice />
          )}
          {showBuildingsSection && isPastBuildingsVisibilityTime && (
            <div
              className={
                effectiveIsEditMode ? "rounded-xl bg-pink-300/45 p-2" : ""
              }
            >
              <Buildings
                isEditMode={effectiveIsEditMode}
                closedItems={closedItems}
              />
            </div>
          )}
          {showDaycareSection && isPastDaycareVisibilityTime && (
            <div
              className={
                effectiveIsEditMode ? "rounded-xl bg-pink-300/45 p-2" : ""
              }
            >
              <Daycare isEditMode={effectiveIsEditMode} />
            </div>
          )}
          {!isFridayMarchBreak && showCommunityCenterSection && (
            <CommunityCenter />
          )}
          {!isFridayMarchBreak && showDropInCenterSection && <DropInCenter />}
          {!isFridayMarchBreak && showChurchSection && <Church />}
        </div>
      )}
    </div>
  );
}

export default App;
