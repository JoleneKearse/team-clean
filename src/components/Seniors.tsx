import { getMopLocationsForDay } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import mopIcon from "../assets/mop.svg";

const Seniors = () => {
  const { currentDay } = useSchedule();
  const isMoppingDay = getMopLocationsForDay(currentDay).includes("seniors");

  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2
        className={`relative ${
          isMoppingDay ? "rounded-t-xl" : "rounded-xl"
        } bg-gray-700 px-4 py-4 text-center font-bold text-gray-100`}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 flex h-18 w-18 -translate-y-1/2 items-center justify-center rounded-full border-2 border-gray-700 bg-gray-200 text-3xl"
        >
          🧓
        </span>
        Seniors{" "}
        {isMoppingDay ? (
          <img
            src={mopIcon}
            alt="mop"
            aria-hidden="true"
            className="inline-block h-5 w-5 align-middle"
          />
        ) : null}
      </h2>
      {isMoppingDay && (
        <p className="px-4 py-2 text-center font-semibold text-sky-800">
          It's a mop day!
        </p>
      )}
    </article>
  );
};

export default Seniors;
