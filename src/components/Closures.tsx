import { CLOSURE_OPTIONS } from "../constants/consts";
import { useSchedule } from "../context/ScheduleContext";
import type { ClosureId } from "../types/types";

type ClosuresProps = {
  onToggleItem?: () => void;
};

function getClosureButtonDomId(closureId: ClosureId): string {
  const normalized = closureId.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `closure-${normalized}`;
}

const Closures = ({ onToggleItem }: ClosuresProps) => {
  const { closedItems, toggleClosedItem } = useSchedule();
  const closedSet = new Set(closedItems);

  return (
    <article className="w-full border border-gray-500 overflow-hidden rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        What buildings change?
      </h2>
      <div className="rounded-b-xl p-4">
        <p className="px-2 pb-3 text-sm text-gray-700">
          Tap any item to hide/show it for this day.
        </p>
        <ul className="px-12 space-y-2">
          {CLOSURE_OPTIONS.map((closureOption) => {
            const isClosed = closedSet.has(closureOption.id);

            return (
              <li key={closureOption.id}>
                <button
                  id={getClosureButtonDomId(closureOption.id)}
                  data-closure-id={closureOption.id}
                  type="button"
                  aria-pressed={isClosed}
                  onClick={() => {
                    toggleClosedItem(closureOption.id);
                    onToggleItem?.();
                  }}
                  className={[
                    "w-full flex items-center justify-between rounded-sm px-2 py-1 text-left transition",
                    closureOption.colorClass,
                    isClosed ? "opacity-55" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className={isClosed ? "line-through" : ""}>
                    {closureOption.label}
                  </span>

                  {isClosed ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
};

export default Closures;
