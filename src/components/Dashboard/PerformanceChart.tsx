'use client';

import React, { useState } from 'react';
import { Activity } from 'lucide-react';
import { formatDateRu } from '@/lib/utils';

interface DataPoint {
  date: string;
  gpa: number;
}

interface PerformanceChartProps {
  data: DataPoint[];
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-5 rounded-lg bg-surface border border-surface-border text-center text-xs text-zinc-500">
        Нет данных для построения графика успеваемости
      </div>
    );
  }

  const values = data.map((d) => d.gpa);
  const minGpa = Math.max(1, Math.floor(Math.min(...values) - 0.5));
  const maxGpa = Math.min(10, Math.ceil(Math.max(...values) + 0.5));

  const width = 600;
  const height = 180;
  const paddingX = 40;
  const paddingY = 25;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const getX = (index: number) => {
    if (data.length <= 1) return width / 2;
    return paddingX + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    const range = maxGpa - minGpa || 1;
    const normalized = (val - minGpa) / range;
    return height - paddingY - normalized * chartHeight;
  };

  const points = data.map((d, i) => `${getX(i)},${getY(d.gpa)}`).join(' ');
  const areaPoints = `${getX(0)},${height - paddingY} ${points} ${getX(data.length - 1)},${height - paddingY}`;

  // Определяем шаг подписей по оси X, чтобы даты никогда не налезали друг на друга на телефоне
  const labelStep = Math.max(1, Math.ceil(data.length / 6));

  return (
    <div className="p-4 sm:p-5 rounded-lg bg-surface border border-surface-border">
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-zinc-400 shrink-0" />
          <span className="text-xs uppercase tracking-wider text-zinc-300 font-medium truncate">
            Динамика успеваемости по дням
          </span>
        </div>
        <div className="text-xs font-mono text-zinc-400 shrink-0">
          {minGpa}.0 – {maxGpa}.0
        </div>
      </div>

      <div className="relative w-full aspect-[2.6/1] sm:aspect-[3.5/1]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Горизонтальные направляющие линии */}
          {[minGpa, Number(((minGpa + maxGpa) / 2).toFixed(1)), maxGpa].map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#27272a"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fill="#71717a"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Заливка области */}
          <polygon points={areaPoints} fill="url(#gpaGradient)" />

          {/* Линия графика */}
          <polyline
            points={points}
            fill="none"
            stroke="#f4f4f5"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Узловые точки */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cy = getY(d.gpa);
            const isHovered = hoveredIndex === i;
            const showDateLabel =
              i === 0 || i === data.length - 1 || i % labelStep === 0;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setHoveredIndex(hoveredIndex === i ? null : i)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#000000"
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all"
                />
                {showDateLabel && (
                  <text
                    x={cx}
                    y={height - 6}
                    textAnchor="middle"
                    fill="#71717a"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatDateRu(d.date)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Тултип при наведении или нажатии */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute -top-2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-100 text-xs px-2.5 py-1 rounded shadow-lg pointer-events-none font-mono whitespace-nowrap z-10"
            style={{
              left: `${Math.max(15, Math.min(85, (getX(hoveredIndex) / width) * 100))}%`,
            }}
          >
            <span>{formatDateRu(data[hoveredIndex].date)}: </span>
            <span className="font-bold">{data[hoveredIndex].gpa.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
