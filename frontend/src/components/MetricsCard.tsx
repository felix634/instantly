import React from 'react';

interface MetricsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: React.ReactNode;
    trend?: {
        value: number;
        label: string;
        isPositive: boolean;
    };
}

const MetricsCard: React.FC<MetricsCardProps> = ({ title, value, subtitle, icon, trend }) => {
    return (
        <div className="p-6 rounded-2xl glass glass-hover transition-all">
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">{value}</span>
                        {trend && (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                                }`}>
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </span>
                        )}
                    </div>
                    {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
                </div>
                {icon && <div className="p-3 rounded-xl bg-primary/10 text-primary">{icon}</div>}
            </div>
        </div>
    );
};

export default MetricsCard;
