"use client";

import type { FC } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import type { ChartDataPoint } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface NetWorthChartProps {
  data: ChartDataPoint[];
  translations: {
    title: string;
    description: string;
    label: string;
  };
  locale: string;
  currency: string;
  chartKey: 'netWorth' | 'cashFlow';
}

export const NetWorthChart: FC<NetWorthChartProps> = ({ data, translations, locale, currency, chartKey }) => {
  const chartConfig = {
    [chartKey]: {
      label: translations.label,
      color: chartKey === 'netWorth' ? 'hsl(var(--primary))' : 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig;

  const minWidth = data.length * 50;
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap">
          <ChartContainer config={chartConfig} className="h-[250px] w-full" style={{ minWidth: `${minWidth}px`}}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`fill${chartKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={`var(--color-${chartKey})`} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={`var(--color-${chartKey})`} stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value}
                  style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                      const number = Number(value);
                      if (number >= 1000000 || number <= -1000000) {
                          return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(number/1000000)}M`;
                      }
                      if (number >= 1000 || number <= -1000) {
                          return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(number/1000)}k`;
                      }
                      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(number);
                  }}
                  style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                  content={<ChartTooltipContent
                      formatter={(value) => 
                          `${new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value))}`
                      }
                      indicator="dot"
                  />}
                />
                <Legend content={<ChartLegendContent />} />
                <Area
                  dataKey={chartKey}
                  type="natural"
                  fill={`url(#fill${chartKey})`}
                  stroke={`var(--color-${chartKey})`}
                  stackId="a"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
