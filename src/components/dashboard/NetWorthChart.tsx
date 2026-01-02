
"use client";

import { type FC, useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import type { ChartDataPoint } from '@/lib/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface NetWorthChartProps {
  data: ChartDataPoint[];
}

const yAxisFormatter = (value: number, locale: string, currency: string) => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
};


export const NetWorthChart: FC<NetWorthChartProps> = ({ data }) => {
  const [isMounted, setIsMounted] = useState(false);
  const translations = {
    title: "Històric del Patrimoni",
    description: "Evolució del teu patrimoni net i flux de caixa durant els últims 30 dies.",
    netWorthLabel: "Patrimoni Net",
    cashFlowLabel: "Flux de Caixa",
  };
  const locale = 'ca-ES';
  const currency = 'EUR';

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const chartConfig = {
    netWorth: {
      label: translations.netWorthLabel,
      color: 'hsl(var(--chart-1))',
    },
    cashFlow: {
        label: translations.cashFlowLabel,
        color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig;

  const minWidth = data.length * 50;
  
  const chartMargin = { top: 5, right: 10, left: 10, bottom: 5 };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[270px] w-full">
          {isMounted ? (
             <ScrollArea className="w-full whitespace-nowrap">
                <div style={{ width: `${minWidth}px`, height: '250px' }}>
                    <ChartContainer config={chartConfig} className="h-full w-full">
                        <AreaChart 
                        accessibilityLayer 
                        data={data}
                        margin={chartMargin}
                        >
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
                            tickFormatter={(value) => yAxisFormatter(Number(value), locale, currency)}
                            width={70}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                            content={<ChartTooltipContent 
                                formatter={(value) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value))}
                                indicator="dot"
                            />}
                        />
                        <Legend content={<ChartLegendContent />} />
                        <Area dataKey="netWorth" name={translations.netWorthLabel} type="natural" fill="url(#fillNetWorth)" stroke="var(--color-netWorth)" fillOpacity={1} />
                        <Area dataKey="cashFlow" name={translations.cashFlowLabel} type="natural" fill="url(#fillCashFlow)" stroke="var(--color-cashFlow)" fillOpacity={1} />
                        </AreaChart>
                    </ChartContainer>
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
