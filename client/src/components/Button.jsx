/* eslint-disable react/prop-types */
import clsx from "clsx";

const Button = ({ icon, className, label, type, onClick }) => {
  return (
    <button
      onClick={onClick}
      type={type}
      className={clsx("px-3 py-2 outline-none", className)}
    >
      <span>{label}</span>
      {icon && icon}
    </button>
  );
};

export default Button;