
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
    netWorthLabel: string;
    cashFlowLabel: string;
  };
  locale: string;
  currency: string;
}

const yAxisFormatter = (value: number, locale: string, currency: string) => {
    if (Math.abs(value) >= 1000000) {
        return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(value/1000000)}M`;
    }
    if (Math.abs(value) >= 1000) {
        return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(value/1000)}k`;
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
};


export const NetWorthChart: FC<NetWorthChartProps> = ({ data, translations, locale, currency }) => {
  const chartConfig = {
    netWorth: {
      label: translations.netWorthLabel,
      color: 'hsl(var(--primary))',
    },
    cashFlow: {
        label: translations.cashFlowLabel,
        color: 'hsl(var(--chart-2))',
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
            <div style={{ width: `${minWidth}px`, height: '250px' }}>
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <AreaChart accessibilityLayer data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="fillNetWorth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-netWorth)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-netWorth)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillCashFlow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-cashFlow)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-cashFlow)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <YAxis 
                            yAxisId="left" 
                            orientation="left" 
                            stroke="hsl(var(--primary))" 
                            tickFormatter={(value) => yAxisFormatter(Number(value), locale, currency)}
                            width={80}
                        />
                         <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            stroke="hsl(var(--chart-2))" 
                            tickFormatter={(value) => yAxisFormatter(Number(value), locale, currency)}
                            width={80}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                            content={<ChartTooltipContent 
                                formatter={(value, name) => (
                                    <div className="flex flex-col">
                                        <span className="capitalize">{name === 'netWorth' ? chartConfig.netWorth.label : chartConfig.cashFlow.label}</span>
                                        <span className="font-bold">{new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value))}</span>
                                    </div>
                                )}
                                indicator="dot"
                            />}
                        />
                        <Legend content={<ChartLegendContent />} />
                        <Area yAxisId="left" dataKey="netWorth" type="natural" fill="url(#fillNetWorth)" stroke="var(--color-netWorth)" />
                        <Area yAxisId="right" dataKey="cashFlow" type="natural" fill="url(#fillCashFlow)" stroke="var(--color-cashFlow)" />
                    </AreaChart>
                </ChartContainer>
            </div>
            <ScrollBar orientation="horizontal" className="mt-2" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
