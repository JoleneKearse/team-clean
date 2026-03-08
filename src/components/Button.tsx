import type { ReactNode } from "react";

type ButtonProps = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
};

const Button = ({ label, onClick, icon, disabled = false }: ButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-28 rounded-lg bg-gray-800 px-4 py-2 text-gray-200 transition-colors focus:bg-gray-600 disabled:cursor-not-allowed disabled:bg-gray-500 disabled:text-gray-200"
    >
      <span className="flex items-center justify-center gap-2">
        <span>{label}</span>
        {icon}
      </span>
    </button>
  );
};

export default Button;
