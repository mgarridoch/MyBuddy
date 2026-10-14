import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Props {
  data: { date: string; value: number }[];
  color?: string;
  unit?: string;
}

export const WeightChart: React.FC<Props> = ({
  data,
  color = '#9381ff',
  unit = 'kg',
}) => {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--color-text-muted)',
          fontSize: '0.88rem',
        }}
      >
        Sin registros suficientes para graficar aún.
      </div>
    );
  }

  const gradientId = `chartGrad-${color.replace('#', '')}`;

  return (
    <div style={{ width: '100%', height: 270 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(147, 129, 255, 0.12)" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="date"
            style={{ fontSize: '0.75rem' }}
            tick={{ fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={['dataMin - 1', 'dataMax + 1']}
            style={{ fontSize: '0.75rem' }}
            tick={{ fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-white)',
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-main)',
              fontSize: '0.85rem',
            }}
            formatter={(value: any) => [`${value} ${unit}`, 'Registro']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#${gradientId})`}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};