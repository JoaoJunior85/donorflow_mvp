export default function StatCard({ label, value, sub, accent = 'brand' }) {
  const accents = {
    brand: 'border-brand-500',
    green: 'border-emerald-500',
    amber: 'border-amber-500',
    red: 'border-red-500',
  };

  return (
    <div className={`bg-white rounded-xl border-l-4 ${accents[accent]} shadow-sm p-5`}>
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className="text-2xl font-bold mt-1 text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}
