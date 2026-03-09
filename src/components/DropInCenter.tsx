import dropInImage from "../assets/drop-in.webp";

const DropInCenter = () => {
  return (
    <article className="w-full border border-gray-500 rounded-xl shadow-lg bg-gray-200">
      <h2 className="relative rounded-xl bg-gray-700 px-4 py-4 text-center font-bold text-gray-100">
        <img
          src={dropInImage}
          alt="drop-in center"
          aria-hidden="true"
          className="pointer-events-none absolute -left-3 top-7 h-18 w-18 -translate-y-1/2 rounded-full border-2 border-gray-700 object-cover"
        />
        Drop-in Center
      </h2>
    </article>
  );
};

export default DropInCenter;
