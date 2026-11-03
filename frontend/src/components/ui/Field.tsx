import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

const CONTROL =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-50';

function controlClass(error?: string) {
  return `${CONTROL} ${error ? 'border-red-400 focus:ring-red-300' : 'border-slate-300 focus:border-brand-500 focus:ring-brand-100'}`;
}

interface FieldWrapperProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

function FieldWrapper({ label, htmlFor, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, name, className = '', ...props },
  ref,
) {
  const inputId = id ?? name ?? label;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint}>
      <input
        ref={ref}
        id={inputId}
        name={name}
        aria-invalid={Boolean(error)}
        className={`${controlClass(error)} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, error, options, placeholder, id, name, ...props }: SelectProps) {
  const selectId = id ?? name ?? label;
  return (
    <FieldWrapper label={label} htmlFor={selectId} error={error}>
      <select id={selectId} name={name} aria-invalid={Boolean(error)} className={controlClass(error)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}
