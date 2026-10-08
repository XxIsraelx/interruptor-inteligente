'use client';

import { useId } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmt } from '@/lib/format';
import type { LivePoint } from '@/lib/types';
import { TooltipBox } from './ChartTooltip';

/** Mini-gráfico de área (potência ao vivo), sem eixos; tooltip com valor e hora. */
export function Sparkline({
  data,
  color,
  height = 56,
  label = 'Potência',
  minMax = 50,
}: {
  data: LivePoint[];
  color: string;
  height?: number;
  label?: string;
  /** escala mínima do eixo (W) para uma linha quase parada não parecer uma montanha */
  minMax?: number;
}) {
  const gid = useId().replace(/:/g, '');
  const max = Math.max(minMax, ...data.map((d) => d.p));
  return (
    <div style={{ height }} className="w-full">
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis domain={[0, max * 1.12]} hide />
            <Tooltip
              cursor={{ stroke: '#2b3644', strokeWidth: 1 }}
              isAnimationActive={false}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipBox
                    title={fmt.time(payload[0].payload.t)}
                    rows={[{ color, label, value: fmt.watts(payload[0].payload.p), strong: true }]}
                  />
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="p"
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gid})`}
              isAnimationActive={false}
              dot={false}
              activeDot={{ r: 4, fill: color, stroke: '#0f141b', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-end">
          <div className="h-px w-full bg-border" />
        </div>
      )}
    </div>
  );
}
