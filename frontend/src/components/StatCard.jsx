import { Icon } from './UI';

export default function StatCard({ label, value, sub, accent = 'brand', icon = 'wallet' }) {
  const palettes = {
    brand: {
      wrapper: 'stat-card-brand border-brand-500',
      glow: 'rgba(16, 185, 129, 0.26)',
      accent: '#059669',
      badge: 'rgba(5, 150, 105, 0.12)',
    },
    donated: {
      wrapper: 'stat-card-donated border-[#c2410c]',
      glow: 'rgba(194, 65, 12, 0.22)',
      accent: '#c2410c',
      badge: 'rgba(194, 65, 12, 0.12)',
    },
    green: {
      wrapper: 'stat-card-green border-emerald-500',
      glow: 'rgba(16, 185, 129, 0.28)',
      accent: '#059669',
      badge: 'rgba(16, 185, 129, 0.12)',
    },
    amber: {
      wrapper: 'stat-card-amber border-amber-500',
      glow: 'rgba(245, 158, 11, 0.24)',
      accent: '#d97706',
      badge: 'rgba(217, 119, 6, 0.12)',
    },
    red: {
      wrapper: 'stat-card-red border-red-500',
      glow: 'rgba(239, 68, 68, 0.22)',
      accent: '#dc2626',
      badge: 'rgba(239, 68, 68, 0.12)',
    },
    purple: {
      wrapper: 'stat-card-purple border-purple-500',
      glow: 'rgba(124, 58, 237, 0.22)',
      accent: '#7c3aed',
      badge: 'rgba(124, 58, 237, 0.12)',
    },
  };

  const palette = palettes[accent] ?? palettes.brand;

  return (
    <div
      className={`stat-card min-w-0 rounded-2xl border-l-4 p-5 shadow-sm transition-transform hover:-translate-y-0.5 ${palette.wrapper}`}
      style={{
        '--card-glow': palette.glow,
        '--card-accent': palette.accent,
        '--card-badge': palette.badge,
      }}
    >
      <div className="stat-card-grid" />
      <div className="stat-card-shape" />
      <div className="relative z-10">
        <div className="mb-5 flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <span className="stat-icon" style={{ background: palette.badge, color: palette.accent }}>
            <Icon name={icon} size={24} />
          </span>
        </div>
        <p className="truncate text-3xl font-bold tracking-tight text-slate-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}
