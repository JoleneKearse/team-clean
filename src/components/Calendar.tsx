import CalendarWeekly from "./CalendarWeekly";
import type { DayKey } from "../types/types";

type CalendarView = "weekly" | "daily";

type CalendarProps = {
  calendarView: CalendarView;
  highlightedDayKey: DayKey;
};

const Calendar = ({ calendarView, highlightedDayKey }: CalendarProps) => {
  return calendarView === "weekly" ? (
    <CalendarWeekly highlightedDayKey={highlightedDayKey} />
  ) : null;
};

export default Calendar;
