import {
  getMopLocationsForDay,
  getNecessaryJobStyle,
  JOBS,
} from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import mopIcon from "../assets/mop.svg";
import { getCleanerInitialsBadgeClassName } from "../utils/cleanerBadgeUtils";

const Seniors = () => {
  const { currentDay, buildingWeeklyAssignments } = useSchedule();
  const isFriday = currentDay === "fri";
  const isMoppingDay = getMopLocationsForDay(currentDay).includes("seniors");
  const flo1JobIndex = JOBS.indexOf("Flo1");
  const flo2JobIndex = JOBS.indexOf("Flo2");
  const swJobIndex = JOBS.indexOf("SW");
  const sanJobIndex = JOBS.indexOf("San");
  const flo3JobIndex = JOBS.indexOf("Flo3");
  const flo1Initials =
    flo1JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo1JobIndex] ?? "")
      : "";
  const flo2Initials =
    flo2JobIndex >= 0
      ? (buildingWeeklyAssignments[currentDay][flo2JobIndex] ?? "")
      : "";
  const chartAssignments = [
    { job: "SW", initials: swJobIndex >= 0 ? (buildingWeeklyAssignments[currentDay][swJobIndex] ?? "") : "" },
    { job: "San", initials: sanJobIndex >= 0 ? (buildingWeeklyAssignments[currentDay][sanJobIndex] ?? "") : "" },
    { job: "Flo3", initials: flo3JobIndex >= 0 ? (buildingWeeklyAssignments[currentDay][flo3JobIndex] ?? "") : "" },
  ];

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2
        className={`relative ${
          isMoppingDay ? "rounded-t-xl" : "rounded-xl"
        } bg-gray-700 px-4 py-4 text-center font-bold text-gray-100`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 flex h-18 w-18 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gray-700 bg-gray-200 text-3xl"
        >
          🧓
        </span>
        Seniors{" "}
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
      <div className="border-t border-gray-300 px-4 py-3 text-sm text-gray-700">
        {isFriday && flo1Initials && (
          <p className="flex flex-wrap items-center justify-center gap-1.5 text-center">
            <span className={getCleanerInitialsBadgeClassName("Flo1")}>
              {flo1Initials}
            </span>
            <span>
              sanitizes, sweeps, and collects the garbage from the{" "}
              <strong>lounge</strong>.
            </span>
          </p>
        )}
        {isFriday && flo2Initials && (
          <p className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-center">
            <span className={getCleanerInitialsBadgeClassName("Flo2")}>
              {flo2Initials}
            </span>
            <span>
              checks the activity room. If used, santize, sweep and get the
              garbage, or see the lead for assignment.
            </span>
          </p>
        )}

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-400 bg-white">
          <table className="w-full table-fixed border-collapse text-center">
            <tbody>
              <tr>
                {chartAssignments.map(({ job }) => {
                  const necessaryJobStyle = getNecessaryJobStyle(job);

                  return (
                    <td
                      key={`${job}-label`}
                      className={[
                        "border border-gray-400 px-2 py-1 font-normal italic",
                        necessaryJobStyle
                          ? necessaryJobStyle.solidClass
                          : "bg-white text-gray-900",
                        necessaryJobStyle ? necessaryJobStyle.textClass : "text-gray-900",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {job}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {chartAssignments.map(({ job, initials }) => {
                  const necessaryJobStyle = getNecessaryJobStyle(job);

                  return (
                    <td
                      key={`${job}-initials`}
                      className={[
                        "border border-gray-400 px-2 py-1 font-normal",
                        initials !== ""
                          ? necessaryJobStyle
                            ? necessaryJobStyle.lineBgClass
                            : "bg-gray-100 text-gray-900"
                          : "bg-gray-100 text-gray-500",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {initials}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </article>
  );
};

export default Seniors;
