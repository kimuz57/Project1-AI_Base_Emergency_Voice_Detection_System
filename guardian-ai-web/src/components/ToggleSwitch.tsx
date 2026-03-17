"use client";

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
}

export default function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  icon,
  iconColor = "text-gray-400",
}: ToggleSwitchProps) {
  return (
    <div className="settings-row">
      <div className="flex items-center gap-4">
        {icon && (
          <span className={`material-symbols-outlined text-2xl ${iconColor}`}>{icon}</span>
        )}
        <div>
          {label && <p className="text-base font-medium">{label}</p>}
          {description && <p className="text-xs font-medium text-gray-400">{description}</p>}
        </div>
      </div>
      <label className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
