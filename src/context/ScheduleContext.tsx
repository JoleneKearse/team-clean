import { createContext, useContext, useState } from "react";

import { generateWeeklyAssignments } from "../utils/scheduleUtils";

import type { DayKey, JobId } from "../types/types";

interface ScheduleContextType {
  days: { key: DayKey; label: string }[];
  jobs: JobId[];
  cleaners: string[];
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
  const days: { key: DayKey; label: string }[] = [
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
  ];
  const jobs: JobId[] = [
    "Bath",
    "Flo1",
    "SW",
    "Flo2",
    "Vac",
    "San",
    "Flo3",
    "Gar",
  ];
  const cleaners = ["PW", "JA", "BM", "SN", "AP", "D", "JK", "TW"];

  const [selectedDay, setSelectedDay] = useState<DayKey>("mon");

  const weeklyAssignments = generateWeeklyAssignments(cleaners);

  return (
    <ScheduleContext.Provider
      value={{
        days,
        jobs,
        cleaners,
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
