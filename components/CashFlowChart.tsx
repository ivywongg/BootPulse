'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type CashFlowChartDatum = Record<string, string | number>;

export type CashFlowChartLine = {
  dataKey: string;
  label: string;
  stroke?: string;
  strokeDasharray?: string;
};

type CashFlowChartProps = {
  data: readonly CashFlowChartDatum[];
  lines: readonly CashFlowChartLine[];
  height?: number;
  currency?: string;
};

const lineStyles = [
  { stroke: '#1e3a8a', strokeDasharray: undefined },
  { stroke: '#b45309', strokeDasharray: '8 4' },
  { stroke: '#15803d', strokeDasharray: '2 4' },
];

function formatValue(value: number | string, currency: string) {
  return typeof value === 'number'
    ? value.toLocaleString('en-US', { style: 'currency', currency, maximumFractionDigits: 0 })
    : value;
}

// Chart values are in whole currency units (cents / 100); the table beside every chart has exact amounts.
export default function CashFlowChart({ data, lines, height = 320, currency = 'USD' }: CashFlowChartProps) {
  return (
    <div className="w-full">
      <div aria-label="Cash flow chart. Monthly values are provided in the accompanying table." role="img">
      <ResponsiveContainer height={height} width="100%">
        <LineChart accessibilityLayer={false} data={data} margin={{ top: 16, right: 24, bottom: 24, left: 12 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            label={{ value: 'Month', position: 'insideBottom', offset: -12 }}
            tick={{ fill: '#334155', fontSize: 12 }}
          />
          <YAxis
            label={{ value: `Amount (${currency})`, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            tick={{ fill: '#334155', fontSize: 12 }}
            tickFormatter={(value: number) => formatValue(value, currency)}
            width={100}
          />
          <Tooltip formatter={(value) => formatValue(value as number | string, currency)} />
          <Legend height={36} verticalAlign="top" />
          {lines.map((line, index) => {
            const style = lineStyles[index % lineStyles.length];
            return (
              <Line
                dataKey={line.dataKey}
                dot={{ r: 3 }}
                key={line.dataKey}
                name={line.label}
                stroke={line.stroke ?? style.stroke}
                strokeDasharray={line.strokeDasharray ?? style.strokeDasharray}
                strokeWidth={2}
                type="monotone"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Cash-flow chart monthly values ({currency})</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            {lines.map((line) => <th key={line.dataKey} scope="col">{line.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={String(row.month)}>
              <th scope="row">{row.month}</th>
              {lines.map((line) => <td key={line.dataKey}>{formatValue(row[line.dataKey], currency)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
