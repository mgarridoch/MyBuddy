import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { date: string; value: number }[];
  color?: string;
  unit?: string;
}

export const WeightChart: React.FC<Props> = ({ data, color = "#9381ff", unit = "kg" }) => {
  if (data.length === 0) return <div style={{textAlign:'center', padding:'20px', color:'#888'}}>Sin datos aún</div>;

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <XAxis dataKey="date" style={{fontSize: '0.8rem'}} tick={{fill: '#888'}} />
          <YAxis domain={['auto', 'auto']} style={{fontSize: '0.8rem'}} tick={{fill: '#888'}} />
          <Tooltip 
            contentStyle={{backgroundColor: 'var(--color-white)', borderRadius: '8px', border: '1px solid var(--color-border)'}}
            formatter={(value: any) => [`${value} ${unit}`, 'Peso']}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={3}
            dot={{r: 4, fill: color}}
            activeDot={{r: 6}} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};