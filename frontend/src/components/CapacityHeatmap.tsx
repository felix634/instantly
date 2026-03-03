import React from 'react';

interface CapacityHeatmapProps {
    data: {
        date: string;
        load: number; // 0 to 100
    }[];
}

const CapacityHeatmap: React.FC<CapacityHeatmapProps> = ({ data }) => {
    // Generate dummy data if none provided (for the next 14 days)
    const displayData = data.length > 0 ? data : Array.from({ length: 14 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() + i);
        return {
            date: date.toISOString().split('T')[0],
            load: Math.floor(Math.random() * 90) + 10
        };
    });

    const getIntensityClass = (load: number) => {
        if (load > 85) return 'bg-destructive/60 border-destructive/40';
        if (load > 70) return 'bg-orange-500/60 border-orange-400/40';
        if (load > 40) return 'bg-primary/60 border-primary/40';
        return 'bg-emerald-500/60 border-emerald-400/40';
    };

    return (
        <div className="p-6 rounded-2xl glass">
            <h3 className="text-lg font-semibold text-foreground mb-6">Capacity Heatmap</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                {displayData.map((day, idx) => (
                    <div
                        key={idx}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all hover:scale-105 ${getIntensityClass(day.load)}`}
                    >
                        <span className="text-[10px] uppercase font-bold text-white/70">
                            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-black text-white">{day.load}%</span>
                        <span className="text-[10px] font-medium text-white/50">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-8 flex items-center justify-end gap-4 text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-emerald-500/60"></div>
                    <span>Low Load</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-primary/60"></div>
                    <span>Optimal</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-destructive/60"></div>
                    <span>Overloaded</span>
                </div>
            </div>
        </div>
    );
};

export default CapacityHeatmap;
