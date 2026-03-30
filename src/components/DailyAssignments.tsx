import { useMemo } from "react";

import { JOBS, getNecessaryJobStyle } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import type { JobId } from "../types/types";
import { parseLocalDateKey } from "../utils/calendarMonthlyUtils";

const LEFT_COLUMN_JOBS: readonly JobId[] = ["Bath", "Flo1", "SW", "Flo2"];
const RIGHT_COLUMN_JOBS: readonly JobId[] = ["Vac", "San", "Flo3", "Gar"];

function getOrdinalSuffix(dayNumber: number): string {
  const remainder10 = dayNumber % 10;
  const remainder100 = dayNumber % 100;

  if (remainder100 >= 11 && remainder100 <= 13) {
    return "th";
  }

  if (remainder10 === 1) return "st";
  if (remainder10 === 2) return "nd";
  if (remainder10 === 3) return "rd";
  return "th";
}

function formatDailyAssignmentHeading(referenceDate: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
  }).format(referenceDate);
  const month = new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(referenceDate);
  const day = referenceDate.getDate();

  return `${weekday}, ${month} ${day}${getOrdinalSuffix(day)} jobs`;
}

type AssignmentRowProps = {
  jobId: JobId;
  initials: string;
};

function AssignmentRow({ jobId, initials }: AssignmentRowProps) {
  const necessaryJobStyle = getNecessaryJobStyle(jobId);
  const badgeClassName = necessaryJobStyle
    ? necessaryJobStyle.badgeClass
    : "bg-[#f3f3f3] text-gray-900";

  return (
    <li className="flex items-center gap-3">
      <span
        className={[
          "inline-flex min-w-14 justify-center rounded px-2 py-0.5 font-medium",
          badgeClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {jobId}
      </span>
      <span className="pl-1 font-semibold text-gray-800">
        {initials || "-"}
      </span>
    </li>
  );
}

const DailyAssignments = () => {
  const { currentDay, selectedDateKey, weeklyAssignments } = useSchedule();

  const selectedDate = useMemo(
    () => parseLocalDateKey(selectedDateKey) ?? new Date(),
    [selectedDateKey],
  );

  const dayAssignments = weeklyAssignments[currentDay] ?? [];

  const getInitialsForJob = (jobId: JobId): string => {
    const index = JOBS.indexOf(jobId);
    if (index < 0) return "";

    return dayAssignments[index] ?? "";
  };

  const headingText = formatDailyAssignmentHeading(selectedDate);

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg bg-gray-200">
      <div className="p-4">
        <p className="font-semibold">{headingText}</p>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2">
          <ul className="space-y-2">
            {LEFT_COLUMN_JOBS.map((jobId) => (
              <AssignmentRow
                key={jobId}
                jobId={jobId}
                initials={getInitialsForJob(jobId)}
              />
            ))}
          </ul>
          <ul className="space-y-2">
            {RIGHT_COLUMN_JOBS.map((jobId) => (
              <AssignmentRow
                key={jobId}
                jobId={jobId}
                initials={getInitialsForJob(jobId)}
              />
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
};

export default DailyAssignments;
