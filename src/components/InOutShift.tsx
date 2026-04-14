import { CLEANERS } from "../constants/consts";

const InOutShift = () => {
    return ( 
        <section className="w-full overflow-hidden rounded-xl border border-gray-500 bg-gray-200 shadow-lg">
            <div className="flex items-center justify-between gap-4 bg-gray-700 px-4 py-4 text-gray-100">
                <h2 className="text-lg font-semibold">In/Out Shift</h2>
                <p className="text-sm italic text-gray-200">
                    Choose the teammate, day and time, and if they are in or out.
                  </p>
                <div className="mt-3 flex flex-wrap gap-3">
                    {CLEANERS.map((cleaner) => (
                        <label key={cleaner} className="flex items-center gap-2">
                            <input type="checkbox" required />
                            {cleaner}
                        </label>
                    ))}
                </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
                {/* Choose date */}
                <input type="time" min="16:00" max="23:59" required />
            </div>
            <div>
                {/* In or out */}
            </div>
        </section>
     );
}
 
export default InOutShift;