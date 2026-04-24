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
    <div className="relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-sky-800 px-4 py-5 shadow-lg">
      <span
        aria-hidden="true"
        className="mop-ball pointer-events-none absolute h-5 w-5 rounded-full bg-sky-400/40"
        style={{ top: "15%", left: "6%", animationDelay: "0s" }}
      />
      <span
        aria-hidden="true"
        className="mop-ball pointer-events-none absolute h-3.5 w-3.5 rounded-full bg-sky-600/70"
        style={{ top: "50%", left: "48%", animationDelay: "-5s" }}
      />
      <span
        aria-hidden="true"
        className="mop-ball pointer-events-none absolute h-4 w-4 rounded-full bg-sky-500/50"
        style={{ top: "25%", right: "5%", animationDelay: "-9s" }}
      />
      <img
        src={mopIcon}
        alt="mop"
        aria-hidden="true"
        className="relative h-6 w-6 shrink-0 brightness-[5]"
      />
      <p className="relative text-center font-semibold text-white">{message}</p>
    </div>
  );
};

export default MopAlert;
