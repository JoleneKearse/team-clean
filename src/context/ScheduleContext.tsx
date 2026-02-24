import { createContext, useContext, useMemo, useState } from "react";

import { generateWeeklyAssignments } from "../utils/scheduleUtils";
import { CLEANERS } from "../constants/consts";

import type { DayKey } from "../types/types";

interface ScheduleContextType {
  weeklyAssignments: Record<DayKey, string[]>;
  selectedDay: DayKey;
  setSelectedDay: React.Dispatch<React.SetStateAction<DayKey>>;
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export const ScheduleProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [selectedDay, setSelectedDay] = useState<DayKey>("mon");

  const weeklyAssignments = useMemo(
    () => generateWeeklyAssignments(CLEANERS),
    [],
  );

  return (
    <ScheduleContext.Provider
      value={{
        weeklyAssignments,
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
