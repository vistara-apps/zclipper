'use client';

interface MetricsProps {
  chatSpeed: number;
  viralScore: number;
  clipsGenerated: number;
  revenue: number;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
  icon?: string;
}

function MetricCard({ label, value, suffix = '', color = 'text-white', icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/60 font-medium uppercase tracking-wide">
            {label}
          </div>
          <div className={`text-2xl font-bold ${color} mt-1`}>
            {value}{suffix}
          </div>
        </div>
        {icon && (
          <div className="text-2xl opacity-50">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Metrics({ chatSpeed, viralScore, clipsGenerated, revenue }: MetricsProps) {
  const formatRevenue = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const getViralColor = () => {
    if (viralScore >= 80) return 'text-red-400';
    if (viralScore >= 60) return 'text-orange-400';
    if (viralScore >= 40) return 'text-yellow-400';
    return 'text-blue-400';
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <MetricCard
        label="Chat Speed"
        value={chatSpeed}
        suffix=" msg/min"
        color="text-blue-400"
        icon="💬"
      />
      
      <MetricCard
        label="Viral Score"
        value={viralScore}
        suffix="/100"
        color={getViralColor()}
        icon="🔥"
      />
      
      <MetricCard
        label="Clips Generated"
        value={clipsGenerated}
        color="text-purple-400"
        icon="🎬"
      />
      
      <MetricCard
        label="Revenue"
        value={formatRevenue(revenue)}
        color="text-green-400"
        icon="💰"
      />
    </div>
  );
}
