import educationImage from "../assets/education.webp";
import { getMopLocationsForDay } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import mopIcon from "../assets/mop.svg";
import { JOBS } from "../constants/consts";
import { getCleanerInitialsBadgeClassName } from "../utils/cleanerBadgeUtils";

const Education = () => {
  const { currentDay, buildingWeeklyAssignments } = useSchedule();
  const isMoppingDay =
    getMopLocationsForDay(currentDay).includes("backBuildings");
  const flo1JobIndex = JOBS.indexOf("Flo1");
  const flo2JobIndex = JOBS.indexOf("Flo2");
  const flo3JobIndex = JOBS.indexOf("Flo3");
  const sanJobIndex = JOBS.indexOf("San");
  const swJobIndex = JOBS.indexOf("SW");
  const bathJobIndex = JOBS.indexOf("Bath");
  const flo1Initials =
    flo1JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo1JobIndex] ?? "")
      : "";
  const flo2Initials =
    flo2JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo2JobIndex] ?? "")
      : "";
  const flo3Initials =
    flo3JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo3JobIndex] ?? "")
      : "";
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

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2
        className={`relative ${
          isMoppingDay ? "rounded-t-xl" : "rounded-xl"
        } bg-gray-700 px-4 py-4 text-center font-bold text-gray-100`}
      >
        <img
          src={educationImage}
          alt="education"
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 h-18 w-18 -translate-y-1/2 rounded-full border-2 border-gray-700 object-cover"
        />
        Education{" "}
        {isMoppingDay ? (
          <img
            src={mopIcon}
            alt="mop"
            aria-hidden="true"
            className="inline-block h-5 w-5 align-middle"
          />
        ) : null}
      </h2>
      {isMoppingDay && (
        <p className="px-4 py-2 text-center font-semibold text-sky-800">
          It's a mop day!
        </p>
      )}
      <p className="border-t border-gray-300 px-4 py-3 text-center text-sm text-gray-700">
        <span className="flex flex-wrap items-center justify-center gap-1.5">
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
          <span>sanitize,</span>
          <span className={getCleanerInitialsBadgeClassName("SW")}>
            {swInitials || "—"}
          </span>
          <span>sweep,</span>
          <span>{flo3Initials ? "and" : "or"}</span>
          <span className={getCleanerInitialsBadgeClassName("Bath")}>
            {bathInitials || "—"}
          </span>
          <span>do the bathrooms in the new extension.</span>
        </span>
      </p>
    </article>
  );
};

export default Education;
