import { useSchedule } from "../context/ScheduleContext";
import { BUILDINGS, JOBS, getNecessaryJobStyle } from "../constants/consts";
import { getBuildingAssignmentsForDay } from "../utils/scheduleUtils";
import type { DayKey } from "../types/types";

type DragAssignmentPayload = {
  day: DayKey;
  jobIndex: number;
};

const DRAG_MIME_TYPE = "application/x-team-clean-assignment";

function getDragPayloadFromEvent(
  event: React.DragEvent<HTMLElement>,
): DragAssignmentPayload | null {
  const rawPayload = event.dataTransfer.getData(DRAG_MIME_TYPE);
  if (!rawPayload) return null;

  try {
    const parsed = JSON.parse(rawPayload) as DragAssignmentPayload;
    const isValidDay =
      parsed.day === "mon" ||
      parsed.day === "tue" ||
      parsed.day === "wed" ||
      parsed.day === "thu" ||
      parsed.day === "fri";

    if (!isValidDay || !Number.isInteger(parsed.jobIndex)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

const Buildings = () => {
  const {
    selectedDay,
    buildingWeeklyAssignments,
    buildingReassignmentFlags,
    moveBuildingAssignment,
  } = useSchedule();

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg p-4 bg-linear-to-b from-gray-500 from-12% to-gray-200 to-12%">
      <h2 className="text-center font-bold text-gray-100">Buildings 🏗️</h2>

      <div className="mt-2 space-y-2">
        {BUILDINGS.map((building) => {
          const assignments = getBuildingAssignmentsForDay({
            day: selectedDay,
            jobs: JOBS,
            weeklyAssignments: buildingWeeklyAssignments,
            buildingJobs: building.jobIds,
          });
          const uniqueAssignedCleaners = new Set(
            assignments
              .map((assignment) => assignment.initials)
              .filter((initials) => initials !== ""),
          );
          const hasOnlyOneAssignedCleaner = uniqueAssignedCleaners.size === 1;

          return (
            <section key={building.key}>
              <h3
                className={[
                  "font-semibold",
                  hasOnlyOneAssignedCleaner ? "text-pink-700" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {hasOnlyOneAssignedCleaner
                  ? `${building.label} needs another cleaner`
                  : building.label}
              </h3>
              <div className="mt-1 rounded-xl overflow-hidden border ">
                <table className="w-full text-center border-collapse">
                  <tbody>
                    <tr>
                      {assignments.map((assignment) => {
                        const jobIndex = JOBS.indexOf(assignment.job);
                        const necessaryJobStyle = getNecessaryJobStyle(
                          assignment.job,
                        );
                        const isReassigned =
                          jobIndex >= 0 &&
                          Boolean(
                            buildingReassignmentFlags[selectedDay]?.[jobIndex],
                          );

                        return (
                          <td
                            key={`${assignment.job}-job`}
                            className={[
                              "italic border border-gray-400 px-2 py-1",
                              necessaryJobStyle
                                ? necessaryJobStyle.solidClass
                                : "",
                              hasOnlyOneAssignedCleaner &&
                              assignment.initials === ""
                                ? "text-pink-700"
                                : "",
                              isReassigned ? "text-pink-700" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {assignment.job}
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
                            buildingReassignmentFlags[selectedDay]?.[jobIndex],
                          );

                        return (
                          <td
                            key={`${assignment.job}-cleaner`}
                            className={[
                              "border border-gray-400 px-2 py-1",
                              hasOnlyOneAssignedCleaner &&
                              assignment.initials === ""
                                ? "bg-pink-100"
                                : necessaryJobStyle
                                  ? necessaryJobStyle.lineBgClass
                                  : "bg-gray-100",
                              necessaryJobStyle
                                ? necessaryJobStyle.textClass
                                : "",
                              isReassigned ? "text-pink-700" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onDragOver={(event) => {
                              event.preventDefault();
                            }}
                            onDrop={(event) => {
                              event.preventDefault();

                              if (jobIndex < 0) return;

                              const source = getDragPayloadFromEvent(event);
                              if (!source || source.day !== selectedDay) return;

                              const sourceInitials =
                                buildingWeeklyAssignments[source.day][
                                  source.jobIndex
                                ] ?? "";

                              if (!sourceInitials) return;

                              moveBuildingAssignment(
                                selectedDay,
                                source.jobIndex,
                                jobIndex,
                              );
                            }}
                          >
                            <span
                              draggable={Boolean(assignment.initials)}
                              onDragStart={(event) => {
                                if (!assignment.initials || jobIndex < 0) {
                                  event.preventDefault();
                                  return;
                                }

                                const payload: DragAssignmentPayload = {
                                  day: selectedDay,
                                  jobIndex,
                                };

                                event.dataTransfer.setData(
                                  DRAG_MIME_TYPE,
                                  JSON.stringify(payload),
                                );
                                event.dataTransfer.effectAllowed = "move";
                              }}
                            >
                              {assignment.initials}
                            </span>
                          </td>
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
  );
};

export default Buildings;
