import CalendarWeekly from "./CalendarWeekly";
import CalendarMonthly from "./CalendarMonthly";
import type { DayKey } from "../types/types";

type CalendarView = "weekly" | "monthly";

type CalendarProps = {
  calendarView: CalendarView;
  highlightedDayKey: DayKey;
  isEditMode: boolean;
  onToggleCalendarView: () => void;
};

const Calendar = ({
  calendarView,
  highlightedDayKey,
  isEditMode,
  onToggleCalendarView,
}: CalendarProps) => {
  return calendarView === "weekly" ? (
    <CalendarWeekly
      highlightedDayKey={highlightedDayKey}
      isEditMode={isEditMode}
      onToggleCalendarView={onToggleCalendarView}
    />
  ) : (
    <CalendarMonthly onToggleCalendarView={onToggleCalendarView} />
  );
};

export default Calendar;
