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
            ? "bg-brand-terracotta text-brand-cream border-brand-terracotta"
            : "bg-white text-brand-stone border-brand-sand"
        }`}
    >
      {label}
    </button>
  );
}
