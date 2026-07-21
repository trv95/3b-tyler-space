import type { FieldDef } from "./requests";

interface Props {
  field: FieldDef;
  value: string;
  error?: string;
  onChange: (key: string, value: string) => void;
}

const labelCls =
  "block font-mono text-[11px] uppercase tracking-[0.18em] text-ink/55 mb-2";
const baseInput =
  "w-full bg-transparent border-0 border-b border-ink/25 pb-2 text-ink font-sans text-[15px] " +
  "placeholder:text-ink/30 focus:outline-none focus:border-ink transition-colors";

export default function Field({ field, value, error, onChange }: Props) {
  const set = (v: string) => onChange(field.key, v);

  return (
    <div className={field.full ? "sm:col-span-2" : ""}>
      <label className={labelCls}>
        {field.label}
        {field.required && <span className="text-oxblood ml-1">*</span>}
      </label>

      {field.type === "textarea" ? (
        <textarea
          rows={3}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => set(e.target.value)}
          className={baseInput + " resize-none leading-relaxed"}
        />
      ) : field.type === "select" ? (
        <select
          value={value}
          onChange={(e) => set(e.target.value)}
          className={baseInput + " cursor-pointer appearance-none"}
        >
          <option value="" disabled>
            Select…
          </option>
          {field.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "money" ? (
        <div className="flex items-center gap-2 border-b border-ink/25 focus-within:border-ink transition-colors pb-2">
          <span className="font-mono text-ink/50 text-[15px]">$</span>
          <input
            inputMode="decimal"
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => set(e.target.value.replace(/[^0-9.]/g, ""))}
            className="w-full bg-transparent border-0 p-0 font-mono text-[15px] text-ink placeholder:text-ink/30 focus:outline-none"
          />
        </div>
      ) : (
        <input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={value}
          placeholder={field.placeholder}
          onChange={(e) => set(e.target.value)}
          className={
            baseInput + (field.type === "number" || field.type === "date" ? " font-mono" : "")
          }
        />
      )}

      {field.hint && !error && (
        <p className="mt-1.5 font-sans text-[12px] text-ink/40">{field.hint}</p>
      )}
      {error && (
        <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wider text-oxblood">
          {error}
        </p>
      )}
    </div>
  );
}
