import { useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
  isPassword?: boolean;
}

const AuthInput = ({ icon: Icon, isPassword, type, className, ...props }: AuthInputProps) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
      <input
        type={isPassword ? (showPassword ? "text" : "password") : type}
        className={`w-full bg-white/5 border border-transparent rounded-lg py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:bg-white/10 focus:border-white/20 focus:outline-none transition-colors ${className ?? ""}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

export default AuthInput;
