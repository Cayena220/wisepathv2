import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface WeeklyPoint {
  label: string;
  start: number;
  end: number;
  count: number;
}

/** Weekly assessments; clicking a week opens the matching results list. */
export function WeeklyChart({ data, onSelect }: { data: WeeklyPoint[]; onSelect?: (point: WeeklyPoint) => void }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
          onClick={(state) => {
            const index = typeof state?.activeTooltipIndex === 'number' ? state.activeTooltipIndex : Number(state?.activeTooltipIndex);
            if (onSelect && Number.isFinite(index) && data[index]) onSelect(data[index]);
          }}
          style={{ cursor: onSelect ? 'pointer' : undefined }}
        >
          <defs>
            <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3E7A6C" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3E7A6C" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(31,51,80,0.07)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#5B6E85' }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#5B6E85' }} tickLine={false} axisLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: '#C2872E', strokeDasharray: '4 4' }}
            contentStyle={{ borderRadius: 12, border: '1px solid rgba(31,51,80,0.12)', fontSize: 12, boxShadow: '0 8px 24px -8px rgba(31,51,80,0.2)' }}
            formatter={(value) => [`${value} assessments`, 'Week of']}
            labelFormatter={(label) => `Week of ${label}`}
          />
          <Area type="monotone" dataKey="count" stroke="#3E7A6C" strokeWidth={2.5} fill="url(#weeklyFill)" activeDot={{ r: 5, fill: '#C2872E', stroke: '#fff', strokeWidth: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
