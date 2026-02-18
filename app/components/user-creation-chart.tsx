'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type Point = {
  label: string;
  total: number;
};

type Props = {
  points: Point[];
};

export function UserCreationChart({ points }: Props) {
  return (
    <div className="user-chart-wrap">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dbe5f3" />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#dbe5f3' }} />
          <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#dbe5f3' }} />
          <Tooltip
            cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }}
            contentStyle={{
              border: '1px solid #dbe5f3',
              borderRadius: 10,
              boxShadow: '0 8px 20px rgba(15,23,42,0.08)'
            }}
          />
          <Bar dataKey="total" name="User Baru" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
