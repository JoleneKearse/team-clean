import { createContext, useContext, useMemo, useState } from "react";

import {
  generateWeeklyAssignments,
  getWeeklyReassignmentFlags,
  getDayKeyFromDate,
  type WeeklyReassignmentFlags,
} from "../utils/scheduleUtils";
import { CLEANERS, JOBS } from "../constants/consts";

import type { CleanerId, DayKey } from "../types/types";

interface ScheduleContextType {
  todayDayKey: DayKey;
  weeklyAssignments: Record<DayKey, string[]>;
  weeklyReassignmentFlags: WeeklyReassignmentFlags;
  presentCleaners: CleanerId[];
  setPresentCleaners: React.Dispatch<React.SetStateAction<CleanerId[]>>;
  peopleIn: number;
  selectedDay: DayKey;
  setSelectedDay: React.Dispatch<React.SetStateAction<DayKey>>;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export const ScheduleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const today = useMemo(() => new Date(), []);
  const todayDayKey = useMemo(() => getDayKeyFromDate(today), [today]);

  const [selectedDay, setSelectedDay] = useState<DayKey>(todayDayKey);
  const [presentCleanersByDay, setPresentCleanersByDay] = useState<
    Record<DayKey, CleanerId[]>
  >({
    mon: [...CLEANERS],
    tue: [...CLEANERS],
    wed: [...CLEANERS],
    thu: [...CLEANERS],
    fri: [...CLEANERS],
  });

  const presentCleaners = presentCleanersByDay[selectedDay];

  const setPresentCleaners: React.Dispatch<
    React.SetStateAction<CleanerId[]>
  > = (valueOrUpdater) => {
    setPresentCleanersByDay((current) => {
      const nextForSelectedDay =
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(current[selectedDay])
          : valueOrUpdater;

      return {
        ...current,
        [selectedDay]: nextForSelectedDay,
      };
    });
  };

  const peopleIn = presentCleaners.length;

  const weeklyAssignments = useMemo(
    () =>
      generateWeeklyAssignments(
        CLEANERS,
        today,
        JOBS.length,
        presentCleanersByDay,
        JOBS,
      ),
    [presentCleanersByDay, today],
  );

  const baselineWeeklyAssignments = useMemo(
    () =>
      generateWeeklyAssignments(CLEANERS, today, JOBS.length, undefined, JOBS),
    [today],
  );

  const weeklyReassignmentFlags = useMemo(
    () =>
      getWeeklyReassignmentFlags({
        baseAssignments: baselineWeeklyAssignments,
        adjustedAssignments: weeklyAssignments,
      }),
    [baselineWeeklyAssignments, weeklyAssignments],
  );

  return (
    <ScheduleContext.Provider
      value={{
        todayDayKey,
        weeklyAssignments,
        weeklyReassignmentFlags,
        presentCleaners,
        setPresentCleaners,
        peopleIn,
        selectedDay,
        setSelectedDay,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSchedule = () => {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within a ScheduleProvider");
  }
  return context;
};
