import type { ReactNode } from "react";

type ButtonProps = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
};

const Button = ({ label, onClick, icon }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="w-28 rounded-lg bg-gray-800 px-4 py-2 text-gray-200 focus:bg-gray-600"
    >
      <span className="flex items-center justify-center gap-2">
        <span>{label}</span>
        {icon}
      </span>
    </button>
  );
};

export default Button;
