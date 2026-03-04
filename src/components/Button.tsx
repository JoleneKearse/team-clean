type ButtonProps = {
  label: string;
  onClick: () => void;
};
const Button = ({ label, onClick }: ButtonProps) => {
  return <button onClick={onClick} className=" w-28 py-2 px-4 rounded-lg bg-gray-800 text-gray-200 focus:bg-gray-600">{label}</button>;
};

export default Button;
