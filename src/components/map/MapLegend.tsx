export function MapLegend() {
  const items = [
    { label: 'Planerad', color: 'hsl(var(--planned))' },
    { label: 'Pågående', color: 'hsl(var(--ongoing))' },
    { label: 'Slutförd', color: 'hsl(var(--completed))' },
    { label: 'Hög risk', color: 'hsl(var(--destructive))', glow: true },
    { label: 'Varning', color: 'hsl(var(--warning))' },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className={`inline-block w-3 h-3 rounded-full border border-white/50 ${item.glow ? 'shadow-[0_0_6px_2px_hsl(var(--destructive)/0.5)]' : ''}`}
            style={{ backgroundColor: item.color }}
          />
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
