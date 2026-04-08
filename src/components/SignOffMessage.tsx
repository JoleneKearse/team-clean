import { useMemo } from "react";

const SIGN_OFF_SAYINGS = [
  "Go home!",
  "Great job everyone!",
  "Enjoy the rest of your night.",
  "That's all folks!",
  "The day is done.",
  "See you next shift.",
  "Get out of here!",
] as const;

function SignOffMessage() {
  const message = useMemo(
    () => SIGN_OFF_SAYINGS[Math.floor(Math.random() * SIGN_OFF_SAYINGS.length)],
    [],
  );

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
