"use client";

import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Color palette
const COLORS = {
  primary: "#3B82F6",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
};

const PIE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4"];

interface ChartProps {
  data: any[];
  height?: number;
  className?: string;
}

interface LineChartProps extends ChartProps {
  lines: { dataKey: string; color?: string; name?: string }[];
  xAxisKey?: string;
}

interface AreaChartProps extends ChartProps {
  areas: { dataKey: string; color?: string; name?: string; gradient?: boolean }[];
  xAxisKey?: string;
}

interface BarChartProps extends ChartProps {
  bars: { dataKey: string; color?: string; name?: string }[];
  xAxisKey?: string;
  stacked?: boolean;
}

interface PieChartProps extends ChartProps {
  dataKey: string;
  nameKey: string;
  innerRadius?: number;
  outerRadius?: number;
  showLabel?: boolean;
}

// Custom tooltip styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Progress Line Chart - Great for showing trends over time
export function ProgressLineChart({
  data,
  lines,
  xAxisKey = "name",
  height = 300,
  className = "",
}: LineChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fontSize: 12 }} 
            stroke="#9ca3af"
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }} 
            stroke="#9ca3af"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: 10 }}
            iconType="circle"
          />
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name || line.dataKey}
              stroke={line.color || Object.values(COLORS)[index % Object.values(COLORS).length]}
              strokeWidth={2}
              dot={{ fill: line.color || Object.values(COLORS)[index % Object.values(COLORS).length], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Growth Area Chart - Great for cumulative data
export function GrowthAreaChart({
  data,
  areas,
  xAxisKey = "name",
  height = 300,
  className = "",
}: AreaChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {areas.map((area, index) => (
              <linearGradient key={area.dataKey} id={`gradient-${area.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop 
                  offset="5%" 
                  stopColor={area.color || Object.values(COLORS)[index % Object.values(COLORS).length]} 
                  stopOpacity={0.4}
                />
                <stop 
                  offset="95%" 
                  stopColor={area.color || Object.values(COLORS)[index % Object.values(COLORS).length]} 
                  stopOpacity={0}
                />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fontSize: 12 }} 
            stroke="#9ca3af"
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }} 
            stroke="#9ca3af"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 10 }} iconType="circle" />
          {areas.map((area, index) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name || area.dataKey}
              stroke={area.color || Object.values(COLORS)[index % Object.values(COLORS).length]}
              strokeWidth={2}
              fill={area.gradient !== false ? `url(#gradient-${area.dataKey})` : area.color}
              fillOpacity={0.6}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Comparison Bar Chart - Great for comparing metrics
export function ComparisonBarChart({
  data,
  bars,
  xAxisKey = "name",
  height = 300,
  stacked = false,
  className = "",
}: BarChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fontSize: 12 }} 
            stroke="#9ca3af"
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 12 }} 
            stroke="#9ca3af"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 10 }} iconType="circle" />
          {bars.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name || bar.dataKey}
              fill={bar.color || Object.values(COLORS)[index % Object.values(COLORS).length]}
              radius={[4, 4, 0, 0]}
              stackId={stacked ? "stack" : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Distribution Pie Chart
export function DistributionPieChart({
  data,
  dataKey,
  nameKey,
  innerRadius = 0,
  outerRadius = 80,
  height = 300,
  showLabel = true,
  className = "",
}: PieChartProps) {
  // Custom label for inside the pie (percentage only)
  const renderCenterLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (!showLabel || percent < 0.05) return null; // Skip small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={showLabel ? renderCenterLabel : undefined}
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            dataKey={dataKey}
            nameKey={nameKey}
            paddingAngle={2}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value: string) => value.length > 15 ? value.substring(0, 15) + "..." : value}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Simple Stat Card with mini chart
interface MiniChartCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  data: any[];
  dataKey: string;
  color?: string;
}

export function MiniChartCard({
  title,
  value,
  change,
  changeLabel = "vs last period",
  data,
  dataKey,
  color = COLORS.primary,
}: MiniChartCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</p>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "↑" : "↓"} {Math.abs(change)}% {changeLabel}
            </p>
          )}
        </div>
        <div className="w-20 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`mini-gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                fill={`url(#mini-gradient-${dataKey})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// XP Growth Chart component for dashboards
interface XPGrowthData {
  date: string;
  xp: number;
  lessons: number;
}

export function XPGrowthChart({ data, height = 250 }: { data: XPGrowthData[]; height?: number }) {
  // Prepare cumulative data
  let cumulativeXP = 0;
  const chartData = data.map((d) => {
    cumulativeXP += d.xp;
    return {
      ...d,
      cumulativeXP,
    };
  });

  return (
    <GrowthAreaChart
      data={chartData}
      areas={[
        { dataKey: "cumulativeXP", name: "Total XP", color: COLORS.primary, gradient: true },
      ]}
      xAxisKey="date"
      height={height}
    />
  );
}

// Weekly Activity Chart
interface WeeklyData {
  week: string;
  lessons: number;
  minutes: number;
  xp: number;
}

export function WeeklyActivityChart({ data, height = 250 }: { data: WeeklyData[]; height?: number }) {
  return (
    <ComparisonBarChart
      data={data}
      bars={[
        { dataKey: "lessons", name: "Lessons", color: COLORS.success },
        { dataKey: "xp", name: "XP Earned", color: COLORS.primary },
      ]}
      xAxisKey="week"
      height={height}
    />
  );
}

// Assessment Performance Chart
interface AssessmentData {
  title: string;
  score: number;
  passingScore: number;
}

export function AssessmentPerformanceChart({ data, height = 250 }: { data: AssessmentData[]; height?: number }) {
  const chartData = data.map((d) => ({
    name: d.title.length > 15 ? d.title.substring(0, 15) + "..." : d.title,
    score: d.score,
    passing: d.passingScore,
  }));

  return (
    <ComparisonBarChart
      data={chartData}
      bars={[
        { dataKey: "score", name: "Your Score", color: COLORS.primary },
        { dataKey: "passing", name: "Passing", color: COLORS.warning },
      ]}
      xAxisKey="name"
      height={height}
    />
  );
}

// Course Progress Distribution
interface CourseProgressData {
  name: string;
  value: number;
}

export function CourseProgressDistribution({ data, height = 250 }: { data: CourseProgressData[]; height?: number }) {
  return (
    <DistributionPieChart
      data={data}
      dataKey="value"
      nameKey="name"
      innerRadius={40}
      outerRadius={80}
      height={height}
    />
  );
}
