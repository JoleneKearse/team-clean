import { useMemo } from "react";

const SIGN_OFF_SAYINGS = [
  "Go home! 🏡",
  "Great job everyone! 👍",
  "Enjoy the rest of your night. 🌘",
  "That's all folks! 🐰",
  "The day is done. 😅",
  "See you next shift. 👋",
  "Get out of here! 🚪",
  "See you later, alligator! 🐊",
  "All wrapped up for today! 🎁",
  "Shift complete! Nice work! ✨",
  "Another day, another sparkle. 🧼",
  "Mission accomplished! ✅",
  "That’s a clean finish! 🧽",
  "Great teamwork today! 🤝",
  "Clocking out in style! 🕓",
  "Everything’s shining now! 🌟",
  "Time to escape the mop zone! 🚿",
  "Cleanup complete — crew dismissed! 🎬",
  "Cleaning legends at work! 🏆",
  "All areas cleared! 🚧",
  "No crumbs left behind! 🍪",
  "Another spotless victory! 🧹",
  "You survived the shift! 😄",
  "Safe trip home everyone! 🛣️",
  "Time to recharge! 🔋",
  "Catch you on the flip side! 🔄",
  "That’s a wraparoo! 🦘",
  "Scoot on outta here! 🛼",
  "Lights out, buckets down! 💡",
  "Off you pop! 🎈",
  "Shift: conquered. 🐉",
] as const;

const EASTERN_TIME_ZONE = "America/Toronto";
const SIGN_OFF_DATE_KEY_STORAGE = "signOffMessageDateKey";
const SIGN_OFF_MESSAGE_STORAGE = "signOffMessageValue";

function getEasternDateKey(referenceDate: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}

function getDailySignOffMessage(referenceDate: Date) {
  const fallbackMessage =
    SIGN_OFF_SAYINGS[Math.floor(Math.random() * SIGN_OFF_SAYINGS.length)];

  if (typeof window === "undefined") {
    return fallbackMessage;
  }

  const dateKey = getEasternDateKey(referenceDate);
  const storedDateKey = window.localStorage.getItem(SIGN_OFF_DATE_KEY_STORAGE);
  const storedMessage = window.localStorage.getItem(SIGN_OFF_MESSAGE_STORAGE);

  if (
    storedDateKey === dateKey &&
    storedMessage &&
    SIGN_OFF_SAYINGS.includes(
      storedMessage as (typeof SIGN_OFF_SAYINGS)[number],
    )
  ) {
    return storedMessage;
  }

  window.localStorage.setItem(SIGN_OFF_DATE_KEY_STORAGE, dateKey);
  window.localStorage.setItem(SIGN_OFF_MESSAGE_STORAGE, fallbackMessage);

  return fallbackMessage;
}

function SignOffMessage() {
  const message = useMemo(() => getDailySignOffMessage(new Date()), []);

  return (
    <section className="relative w-full">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1 rounded-2xl bg-[linear-gradient(to_bottom_right,var(--color-purple-500),var(--color-sky-500),var(--color-lime-500),var(--color-yellow-500),var(--color-orange-500))] opacity-75 blur-sm"
      />
      <div className="relative w-full rounded-xl bg-[linear-gradient(to_bottom_right,var(--color-purple-500),var(--color-sky-500),var(--color-lime-500),var(--color-yellow-500),var(--color-orange-500))] p-px shadow-lg">
        <div className="w-full overflow-hidden rounded-lg bg-gray-200">
          <p className="px-6 py-8 text-xl font-semibold text-gray-900 sm:text-2xl">
            {message}
          </p>
        </div>
      </div>
    </section>
  );
}

export default SignOffMessage;
