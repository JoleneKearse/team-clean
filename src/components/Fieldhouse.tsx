import { JOBS, getNecessaryJobStyle } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";
import type { JobId } from "../types/types";

const FIELDHOUSE_JOBS: readonly JobId[] = ["SW", "San", "Flo3"];
const TOTAL_COLUMNS = 3;

const Fieldhouse = () => {
  const { currentDay, buildingWeeklyAssignments } = useSchedule();
  const fieldhouseAssignments = getBuildingAssignmentsForDay({
    day: currentDay,
    jobs: JOBS,
    weeklyAssignments: buildingWeeklyAssignments,
    buildingJobs: FIELDHOUSE_JOBS,
  });
  const tableCells = [
    ...fieldhouseAssignments.map((assignment) => ({
      job: assignment.job,
      initials: assignment.initials,
    })),
    ...Array.from(
      { length: Math.max(0, TOTAL_COLUMNS - fieldhouseAssignments.length) },
      () => ({
        job: null,
        initials: "",
      }),
    ),
  ];

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative rounded-xl bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 flex h-18 w-18 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gray-700 bg-gray-200 text-3xl"
        >
          🚽
        </span>
        Fieldhouse
      </h2>

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
                      key={`fieldhouse-cell-${index}`}
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

export default Fieldhouse;
