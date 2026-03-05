interface ModulePlaceholderProps {
  what: string;
  now: string[];
  next: string[];
}

export default function ModulePlaceholder({ what, now, next }: ModulePlaceholderProps) {
  return (
    <div className="grid xl:grid-cols-2 gap-4">
      <section className="bg-warm-white border border-sand rounded-lg p-5">
        <p className="font-display font-bold text-xl mb-2">Scope</p>
        <p className="text-forest/70">{what}</p>
      </section>

      <section className="bg-warm-white border border-sand rounded-lg p-5">
        <p className="font-display font-bold text-xl mb-2">Current Build</p>
        <ul className="space-y-1.5 text-forest/70 text-sm">
          {now.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="bg-warm-white border border-sand rounded-lg p-5 xl:col-span-2">
        <p className="font-display font-bold text-xl mb-2">Next Tasks</p>
        <ul className="space-y-1.5 text-forest/70 text-sm">
          {next.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
