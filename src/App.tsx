import { useEffect, useMemo, useState } from "react";

import { useSchedule } from "./context/ScheduleContext";

import { CLEANERS } from "./constants/consts";

import type { CleanerId, ClosureId } from "./types/types";

import Calendar from "./components/Calendar";
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
import Button from "./components/Button";
import Closures from "./components/Closures";

const EASTERN_TIME_ZONE = "America/Toronto";
const DEFAULT_ORDER_CLOSED_ITEMS: readonly ClosureId[] = [
  "Community Center",
  "Drop-in Center",
  "Church",
];
const FULL_SECTION_VISIBILITY = {
  showBuildings: true,
  showDaycare: true,
  showBandOffice: true,
};

function getEasternTimeParts(referenceDate: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIME_ZONE,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(referenceDate);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  return {
    weekday,
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
    closedItems,
    peopleIn,
    presentCleaners,
    setPresentCleaners,
    saveScheduleToFirestore,
    isSavingSchedule,
    saveScheduleError,
    resetScheduleState,
  } = useSchedule();
  const calendarView = "weekly";
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [isEditMode, setIsEditMode] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isClosuresOpen, setIsClosuresOpen] = useState(false);
  const [showSaveSuccessMessage, setShowSaveSuccessMessage] = useState(false);
  const [saveSuccessMessageTick, setSaveSuccessMessageTick] = useState(0);

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
  const sectionVisibility = shouldApplyTimeVisibility
    ? timeBasedVisibility
    : FULL_SECTION_VISIBILITY;
  const closedItemSet = useMemo(() => new Set(closedItems), [closedItems]);
  const effectiveIsEditMode = isEditMode && !isViewingPastDate;
  const isEditUiActive = !isViewingPastDate && (isEditMode || isClosuresOpen);
  const isFriday = currentDay === "fri";
  const isFridayOrMarchBreak = isFriday || isMarchBreakReducedScheduleDay;
  const isBuildingsComponentEnabled = !isFridayOrMarchBreak;
  const isSeniorsComponentEnabled = isFridayOrMarchBreak;
  const isGrade1ComponentEnabled = isFriday;
  const isGrade2ComponentEnabled = isFriday;
  const isEducationComponentEnabled = isFridayOrMarchBreak;
  const isFieldhouseComponentEnabled = isFridayOrMarchBreak;
  const isSocialComponentEnabled = isFridayOrMarchBreak;
  const isAnnexComponentEnabled = isFridayOrMarchBreak;
  const showDaycareSection =
    sectionVisibility.showDaycare && !closedItemSet.has("Daycare");
  const showBandOfficeSection =
    sectionVisibility.showBandOffice && !closedItemSet.has("Band Office");
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
  const showBuildingsSection =
    isBuildingsComponentEnabled && sectionVisibility.showBuildings;
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

  const editButtonLabel = isEditUiActive
    ? isSavingSchedule
      ? "Saving..."
      : "Confirm"
    : "Edit";

  return (
    <div className="mx-auto flex max-w-112.5 flex-col items-center gap-4 p-4">
      <div
        className={[
          "w-full rounded-xl transition-colors",
          isFriday ? "space-y-6" : "space-y-4",
          isEditUiActive ? "bg-pink-200/40 p-2" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <section className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg bg-gray-200">
          <div className="flex items-center justify-between gap-4 bg-gray-700 px-4 py-4 text-gray-100">
            <div>
              <h2 className="font-semibold text-xl">Who is in today?</h2>
              <p className="text-sm italic text-gray-200">
                (Un)Check names if necessary
              </p>
            </div>

            <span
              className={
                peopleIn === 8 ? "font-semibold" : "font-bold text-pink-400"
              }
            >
              Staffing: {peopleIn}
            </span>
          </div>

          <div className="p-4">
            <div className="mt-3 flex flex-wrap gap-3">
              {CLEANERS.map((cleaner) => {
                const checked = presentCleaners.includes(cleaner);

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
                    <span>{cleaner}</span>
                  </label>
                );
              })}
            </div>

            {peopleIn < 8 && (
              <div className="mt-3 flex items-center justify-center gap-2 text-pink-700">
                <p className="font-semibold">
                  Please review the changes below.
                </p>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-6 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
                  />
                </svg>
              </div>
            )}
          </div>
        </section>

        <div className="relative w-full">
          <div
            className={`absolute ${isEditUiActive ? "-left-1" : "left-0"} top-1/2 -translate-y-1/2 mt-1`}
          >
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

          <div
            className={`absolute ${isEditUiActive ? "-right-1" : "right-0"} top-1/2 -translate-y-1/2 mt-1`}
          >
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
        />
        {isFriday && showSeniorsSection && <Seniors />}
        {isFriday && showGrade1Section && <Grade1 />}
        {isFriday && showGrade2Section && <Grade2 />}
        {isFriday && showDaycareSection && (
          <Daycare isEditMode={effectiveIsEditMode} />
        )}
        {isFriday && showEducationSection && <Education />}
        {isFriday && showFieldhouseSection && <Fieldhouse />}
        {isFriday && showSocialSection && <Social />}
        {isFriday && showAnnexSection && <Annex />}
        {showBuildingsSection && (
          <Buildings
            isEditMode={effectiveIsEditMode}
            closedItems={closedItems}
          />
        )}
        {isMarchBreakReducedScheduleDay && showSeniorsSection && <Seniors />}
        {isMarchBreakReducedScheduleDay && showEducationSection && (
          <Education />
        )}
        {isMarchBreakReducedScheduleDay && showFieldhouseSection && (
          <Fieldhouse />
        )}
        {isMarchBreakReducedScheduleDay && showSocialSection && <Social />}
        {isMarchBreakReducedScheduleDay && showAnnexSection && <Annex />}
        {!isFriday && showDaycareSection && (
          <Daycare isEditMode={effectiveIsEditMode} />
        )}
      </div>
      {showBandOfficeSection && <BandOffice />}

      {!isFriday && !isMarchBreakReducedScheduleDay && showSeniorsSection && (
        <Seniors />
      )}
      {!isFriday && showGrade1Section && <Grade1 />}
      {!isFriday && showGrade2Section && <Grade2 />}
      {!isFriday && !isMarchBreakReducedScheduleDay && showEducationSection && (
        <Education />
      )}
      {!isFriday &&
        !isMarchBreakReducedScheduleDay &&
        showFieldhouseSection && <Fieldhouse />}
      {!isFriday && !isMarchBreakReducedScheduleDay && showSocialSection && (
        <Social />
      )}
      {!isFriday && !isMarchBreakReducedScheduleDay && showAnnexSection && (
        <Annex />
      )}
      {showHealthCenterSection && <HealthCenter />}
      {showCommunityCenterSection && <CommunityCenter />}
      {showDropInCenterSection && <DropInCenter />}
      {showChurchSection && <Church />}
    </div>
  );
}

export default App;
