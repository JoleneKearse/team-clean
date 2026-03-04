import CalendarWeekly from "./CalendarWeekly";
import type { DayKey } from "../types/types";

type CalendarView = "weekly" | "daily";

type CalendarProps = {
  calendarView: CalendarView;
  highlightedDayKey: DayKey;
  isEditMode: boolean;
};

const Calendar = ({
  calendarView,
  highlightedDayKey,
  isEditMode,
}: CalendarProps) => {
  return calendarView === "weekly" ? (
    <CalendarWeekly
      highlightedDayKey={highlightedDayKey}
      isEditMode={isEditMode}
    />
  ) : null;
};

export default Calendar;
