import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '../services/api';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const allocated = Number(row.allocated ?? 0);
  const spent = Number(row.spent ?? 0);
  const remaining = Number(row.remaining ?? allocated - spent);
  const used = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{label}</p>
      {row.purpose && <p className="chart-tooltip-purpose">{row.purpose}</p>}
      <dl>
        <div>
          <dt>Allocated</dt>
          <dd>{formatCurrency(allocated)}</dd>
        </div>
        <div>
          <dt>Spent to date</dt>
          <dd>{formatCurrency(spent)}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{formatCurrency(remaining)}</dd>
        </div>
      </dl>
      <p className="chart-tooltip-used">{used}% of this sub-wallet has been used</p>
    </div>
  );
}

export default function SubWalletBarChart({ data = [], title = 'Sub-wallet allocation vs spending' }) {
  const [isMobile, setIsMobile] = useState(false);
  const chartData = (Array.isArray(data) ? data : []).map((item) => ({
    ...item,
    name: item.name?.replace(/\s+Wallet$/i, '') ?? item.name,
    allocated: Number(item.allocated ?? item.allocatedAmount ?? 0),
    spent: Number(item.spent ?? 0),
    remaining: Number(item.remaining ?? Number(item.allocated ?? item.allocatedAmount ?? 0) - Number(item.spent ?? 0)),
  }));

  useEffect(() => {
    const media = window.matchMedia('(max-width: 639px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  if (!chartData.length) {
    return (
      <div className="dashboard-section min-w-0 p-5 sm:p-6">
        <div className="section-header">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <p className="py-12 text-center text-sm text-slate-500">No sub-wallet balances to chart yet</p>
      </div>
    );
  }

  return (
    <div className="dashboard-section min-w-0 p-5 sm:p-6">
      <div className="section-header">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-slate-500">{isMobile ? 'Tap a bar for the detailed amounts.' : 'Hover a bar to see allocated, spent, and remaining amounts.'}</p>
        </div>
      </div>
      <div className="chart-legend" aria-label="Chart legend">
        <span><i className="chart-legend-allocated" />Allocated</span>
        <span><i className="chart-legend-spent" />Spent</span>
        <span><i className="chart-legend-remaining" />Remaining</span>
      </div>
      <div className={`subwallet-chart${isMobile ? ' subwallet-chart-mobile' : ''}`} style={isMobile ? { height: `${Math.max(300, chartData.length * 92)}px` } : undefined}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
          <BarChart layout={isMobile ? 'vertical' : 'horizontal'} data={chartData} margin={isMobile ? { top: 8, right: 8, left: 2, bottom: 8 } : { top: 8, right: 8, left: 4, bottom: 8 }} barGap={4} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={isMobile} horizontal={!isMobile} />
            {isMobile ? (
              <>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(value) => formatCurrency(value)} />
                <YAxis dataKey="name" type="category" width={116} tick={{ fontSize: 10, fill: '#475569' }} tickFormatter={(name) => String(name).length > 16 ? `${String(name).slice(0, 16)}…` : name} />
              </>
            ) : (
              <>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} interval={0} height={48} tickFormatter={(name) => String(name).length > 18 ? `${String(name).slice(0, 18)}…` : name} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(value) => formatCurrency(value)} width={78} />
              </>
            )}
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }} />
            <Bar dataKey="allocated" name="Allocated" fill="#0b1f33" radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="spent" name="Spent" fill="#f59e0b" radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={28} />
            <Bar dataKey="remaining" name="Remaining" fill="#10b981" radius={isMobile ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
