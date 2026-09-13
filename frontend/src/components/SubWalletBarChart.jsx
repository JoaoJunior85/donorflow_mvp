import { lazy, Suspense, useEffect, useState } from 'react';
import { formatCurrency } from '../services/api';

const DesktopChart = lazy(() => import('./SubWalletDesktopChart'));

function MobileSubWalletBars({ data }) {
  return (
    <div className="mobile-subwallet-bars">
      {data.map((item) => {
        const allocated = Math.max(0, item.allocated);
        const spent = Math.min(allocated, Math.max(0, item.spent));
        const remaining = Math.min(allocated - spent, Math.max(0, item.remaining));
        const spentPercent = allocated ? (spent / allocated) * 100 : 0;
        const remainingPercent = allocated ? (remaining / allocated) * 100 : 0;
        return (
          <details key={item.id ?? item.name} className="mobile-subwallet-card">
            <summary>
              <span className="mobile-subwallet-name">{item.name}</span>
              <span className="mobile-subwallet-total">{formatCurrency(allocated)}</span>
            </summary>
            <div className="mobile-bar-track" aria-label={`${item.name}: ${formatCurrency(spent)} spent from ${formatCurrency(allocated)}`}>
              <span className="mobile-bar-spent" style={{ width: `${spentPercent}%` }} />
              <span className="mobile-bar-remaining" style={{ left: `${spentPercent}%`, width: `${remainingPercent}%` }} />
            </div>
            <div className="mobile-subwallet-values">
              <span><i className="chart-legend-allocated" />Allocated <strong>{formatCurrency(allocated)}</strong></span>
              <span><i className="chart-legend-spent" />Spent <strong>{formatCurrency(spent)}</strong></span>
              <span><i className="chart-legend-remaining" />Remaining <strong>{formatCurrency(remaining)}</strong></span>
            </div>
            {item.purpose && <p className="mobile-subwallet-purpose">{item.purpose}</p>}
          </details>
        );
      })}
    </div>
  );
}

export default function SubWalletBarChart({ data = [], title = 'Sub-wallet allocation vs spending' }) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 639px)').matches);
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
      {isMobile ? <MobileSubWalletBars data={chartData} /> : <Suspense fallback={<div className="subwallet-chart chart-loading" /> }><DesktopChart data={chartData} /></Suspense>}
    </div>
  );
}
