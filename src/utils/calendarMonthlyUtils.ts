export type MonthCell = {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
};

export function parseLocalDateKey(dateKey: string): Date | null {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return null;

  const [yearPart, monthPart, dayPart] = parts;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);
  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getMonthlyWeekdayGrid(referenceDate: Date): MonthCell[][] {
  const monthStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
  );
  monthStart.setHours(0, 0, 0, 0);

  const gridStart = new Date(monthStart);
  while (gridStart.getDay() !== 1) {
    gridStart.setDate(gridStart.getDate() - 1);
  }

  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 5 }, (_, columnIndex) => {
      const cellDate = new Date(gridStart);
      cellDate.setDate(gridStart.getDate() + weekIndex * 7 + columnIndex);

      return {
        date: cellDate,
        dateKey: getLocalDateKey(cellDate),
        isCurrentMonth: cellDate.getMonth() === referenceDate.getMonth(),
      };
    }),
  );
}
