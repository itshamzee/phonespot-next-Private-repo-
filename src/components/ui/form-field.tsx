type FormFieldProps = {
  label: string;
  name: string;
  type?: "text" | "email" | "tel" | "textarea" | "select";
  required?: boolean;
  placeholder?: string;
  options?: string[];
  className?: string;
};

const inputStyles =
  "w-full rounded-radius-md border border-soft-grey bg-white px-4 py-3 text-charcoal placeholder:text-gray focus:border-green-eco focus:outline-none focus:ring-1 focus:ring-green-eco transition-colors";

export function FormField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  options,
  className = "",
}: FormFieldProps) {
  const id = `field-${name}`;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-charcoal">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          id={id}
          name={name}
          required={required}
          placeholder={placeholder}
          rows={5}
          className={inputStyles}
        />
      ) : type === "select" ? (
        <select id={id} name={name} required={required} className={inputStyles}>
          <option value="">{placeholder ?? "Vælg..."}</option>
          {options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          className={inputStyles}
        />
      )}
    </div>
  );
}
