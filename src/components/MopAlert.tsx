import { getMopLocationsForDay } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import mopIcon from "../assets/mop.svg";
import type { MopLocation } from "../constants/consts";

function buildMopMessage(locations: readonly MopLocation[]): string | null {
  if (locations.length === 0) return null;

  if (
    locations.includes("seniors") &&
    locations.includes("backBuildings") &&
    locations.length === 2
  ) {
    return "Mop the Seniors and back buildings today.";
  }

  const parts: string[] = [];

  if (locations.includes("seniors")) parts.push("the Seniors");
  if (locations.includes("healthCenter")) parts.push("the Health Center");
  if (locations.includes("bandOffice")) parts.push("the Band Office");
  if (locations.includes("backBuildings"))
    parts.push("Education, Social, Annex, and the Drop-in");

  if (parts.length === 0) return null;
  if (parts.length === 1) return `Mop ${parts[0]} today.`;

  const last = parts.pop();
  return `Mop ${parts.join(", ")} and ${last} today.`;
}

const MopAlert = () => {
  const { currentDay } = useSchedule();
  const locations = getMopLocationsForDay(currentDay);
  const message = buildMopMessage(locations);

  if (!message) return null;

  return (
    <div className="flex w-full items-center justify-center gap-3 rounded-xl bg-sky-800 px-4 py-3 shadow-lg">
      <img
        src={mopIcon}
        alt="mop"
        aria-hidden="true"
        className="h-6 w-6 shrink-0 brightness-[5]"
      />
      <p className="text-center font-semibold text-white">{message}</p>
    </div>
  );
};

export default MopAlert;
