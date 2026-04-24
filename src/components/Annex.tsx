import annexImage from "../assets/annex.webp";
import {
  JOBS,
  getMopLocationsForDay,
  getNecessaryJobStyle,
} from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";
import mopIcon from "../assets/mop.svg";
import type { JobId } from "../types/types";

const ANNEX_JOBS: readonly JobId[] = ["Bath", "Flo2"];
const TOTAL_COLUMNS = 4;

const Annex = () => {
  const { currentDay, buildingWeeklyAssignments } = useSchedule();
  const isMoppingDay =
    getMopLocationsForDay(currentDay).includes("backBuildings");
  const annexAssignments = getBuildingAssignmentsForDay({
    day: currentDay,
    jobs: JOBS,
    weeklyAssignments: buildingWeeklyAssignments,
    buildingJobs: ANNEX_JOBS,
  });
  const tableCells = [
    ...annexAssignments.map((assignment) => ({
      job: assignment.job,
      initials: assignment.initials,
    })),
    ...Array.from(
      { length: Math.max(0, TOTAL_COLUMNS - annexAssignments.length) },
      () => ({
        job: null,
        initials: "",
      }),
    ),
  ];

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative rounded-xl bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <img
          src={annexImage}
          alt="annex"
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 h-18 w-18 -translate-y-1/2 rounded-full border-2 border-gray-700 object-cover"
        />
        Annex{" "}
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
        <p className="border-b border-gray-300 px-4 py-2 text-center font-semibold text-sky-800">
          It's a mop day!
        </p>
      )}

      <div className="rounded-b-xl p-4">
        <div className="rounded-xl overflow-hidden border border-gray-400">
          <table className="w-full table-fixed text-center border-collapse">
            <tbody>
              <tr>
                {tableCells.map((cell, index) => {
                  const necessaryJobStyle = cell.job
                    ? getNecessaryJobStyle(cell.job)
                    : null;

                  return (
                    <td
                      key={`annex-cell-${index}`}
                      className={[
                        "min-w-20 border border-gray-400 px-2 py-1",
                        cell.initials !== ""
                          ? necessaryJobStyle
                            ? necessaryJobStyle.solidClass
                            : "bg-gray-300 text-gray-900"
                          : "bg-gray-100 text-gray-500",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {cell.initials}
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

export default Annex;
