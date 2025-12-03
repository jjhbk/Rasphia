export function ToggleChip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`px-3 py-1 rounded-full text-xs border transition
        ${
          active
            ? "bg-amber-600 text-white border-amber-600"
            : "bg-white text-stone-600 border-stone-300"
        }`}
    >
      {label}
    </button>
  );
}
