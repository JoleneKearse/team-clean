import { createContext, useContext, useMemo, useState } from "react";

import {
  generateWeeklyAssignments,
  getDayKeyFromDate,
} from "../utils/scheduleUtils";
import { CLEANERS } from "../constants/consts";

import type { DayKey } from "../types/types";

interface ScheduleContextType {
  todayDayKey: DayKey;
  weeklyAssignments: Record<DayKey, string[]>;
  peopleIn: number;
  setPeopleIn: React.Dispatch<React.SetStateAction<number>>;
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
  const [peopleIn, setPeopleIn] = useState<number>(CLEANERS.length);

  const activeCleaners = useMemo(
    () => CLEANERS.slice(0, Math.max(1, Math.min(CLEANERS.length, peopleIn))),
    [peopleIn],
  );

  const weeklyAssignments = useMemo(
    () => generateWeeklyAssignments(activeCleaners, today),
    [activeCleaners, today],
  );

  return (
    <ScheduleContext.Provider
      value={{
        todayDayKey,
        weeklyAssignments,
        peopleIn,
        setPeopleIn,
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
