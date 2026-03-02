import { useSchedule } from "../context/ScheduleContext";
import { DAYS, JOBS } from "../constants/consts";
import type { DayKey } from "../types/types";

type CalendarWeeklyProps = {
  highlightedDayKey: DayKey;
};

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

const CalendarWeekly = ({ highlightedDayKey }: CalendarWeeklyProps) => {
  const { weeklyAssignments, weeklyReassignmentFlags, swapAssignments } =
    useSchedule();

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg text-center bg-gray-300">
      <table className="w-full border-spacing-32">
        <thead>
          <tr>
            <th scope="col" className="w-12 bg-pink-400">
              <span className="sr-only">Jobs</span>
            </th>
            {DAYS.map((day) => (
              <th
                key={day.key}
                className={
                  day.key === highlightedDayKey
                    ? "bg-pink-400 border-l border-r"
                    : "bg-pink-400"
                }
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {JOBS.map((job, jobIndex) => (
            // highlight essential jobs for the current day, applying same styling for td highlightedDayKey in markdown below
            <tr key={job} className={job.includes("Flo") ? "bg-[#f3f3f3]" : ""}>
              <td className="sticky left-0 font-bold">{job}</td>

              {DAYS.map((day) =>
                (() => {
                  const isHighlightedDay = day.key === highlightedDayKey;
                  const isFloJob = job.includes("Flo");
                  const initials = weeklyAssignments[day.key][jobIndex] ?? "";
                  const isReassigned = Boolean(
                    weeklyReassignmentFlags[day.key]?.[jobIndex],
                  );
                  const className = [
                    isHighlightedDay
                      ? `${isFloJob ? "bg-gray-100" : "bg-[#a0a3a9]"} border-l border-r border-gray-500`
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <td
                      key={day.key}
                      className={className}
                      onDragOver={(event) => {
                        event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();

                        const source = getDragPayloadFromEvent(event);
                        if (!source || source.day !== day.key) return;

                        const sourceInitials =
                          weeklyAssignments[source.day][source.jobIndex] ?? "";
                        const targetInitials =
                          weeklyAssignments[day.key][jobIndex] ?? "";

                        if (!sourceInitials || !targetInitials) return;

                        swapAssignments(day.key, source.jobIndex, jobIndex);
                      }}
                    >
                      <span
                        draggable={Boolean(initials)}
                        onDragStart={(event) => {
                          if (!initials) {
                            event.preventDefault();
                            return;
                          }

                          const payload: DragAssignmentPayload = {
                            day: day.key,
                            jobIndex,
                          };

                          event.dataTransfer.setData(
                            DRAG_MIME_TYPE,
                            JSON.stringify(payload),
                          );
                          event.dataTransfer.effectAllowed = "move";
                        }}
                        className={
                          isHighlightedDay && isReassigned
                            ? "text-pink-700"
                            : ""
                        }
                      >
                        {initials}
                      </span>
                    </td>
                  );
                })(),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
};

export default CalendarWeekly;
