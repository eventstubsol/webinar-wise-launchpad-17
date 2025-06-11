
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormFieldProps } from "@/types";

export const FormField = ({ 
  label, 
  name, 
  type = "text", 
  placeholder, 
  required = false, 
  error, 
  disabled = false,
  ...props 
}: FormFieldProps & React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
