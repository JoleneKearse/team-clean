import { JOBS, getNecessaryJobStyle } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";
import type { JobId } from "../types/types";
import gradeTwoImage from "../assets/grade-two.webp";

const GRADE_2_JOBS: readonly JobId[] = ["Vac", "Gar", "Flo1"];

const Grade2 = () => {
  const { currentDay, buildingWeeklyAssignments } = useSchedule();
  const grade2Assignments = getBuildingAssignmentsForDay({
    day: currentDay,
    jobs: JOBS,
    weeklyAssignments: buildingWeeklyAssignments,
    buildingJobs: GRADE_2_JOBS,
  });

  const tableCells = grade2Assignments.map((assignment) => ({
    job: assignment.job,
    initials: assignment.initials,
  }));

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative rounded-xl bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 flex h-18 w-18 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-gray-700 bg-gray-200"
        >
          <img
            src={gradeTwoImage}
            alt=""
            className="h-full w-full object-cover"
          />
        </span>
        Grade 2
      </h2>

      <div className="rounded-b-xl p-4">
        <div className="overflow-hidden rounded-xl border border-gray-400 bg-white">
          <table className="w-full table-fixed border-collapse text-center">
            <tbody>
              <tr>
                {tableCells.map((cell, index) => {
                  const necessaryJobStyle = cell.job
                    ? getNecessaryJobStyle(cell.job)
                    : null;

                  return (
                    <td
                      key={`grade2-job-${index}`}
                      className={[
                        "min-w-20 border border-gray-400 px-2 py-1 font-normal italic text-gray-900",
                        necessaryJobStyle ? necessaryJobStyle.solidClass : "bg-gray-100",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {cell.job}
                    </td>
                  );
                })}
              </tr>
              <tr>
                {tableCells.map((cell, index) => {
                  const necessaryJobStyle = cell.job
                    ? getNecessaryJobStyle(cell.job)
                    : null;

                  return (
                    <td
                      key={`grade2-initials-${index}`}
                      className={[
                        "min-w-20 border border-gray-400 px-2 py-1 font-normal text-gray-900",
                        necessaryJobStyle ? necessaryJobStyle.lineBgClass : "bg-gray-100",
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

export default Grade2;
