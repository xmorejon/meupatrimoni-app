
"use client";

import { type FC, useState, useEffect } from 'react';
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
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
};


export const NetWorthChart: FC<NetWorthChartProps> = ({ data, translations, locale, currency }) => {
  const [isMounted, setIsMounted] = useState(false);

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
  
  const chartMargin = { top: 5, right: 30, left: 20, bottom: 5 };
  const xAxisHeight = 25; // Approximate height for XAxis

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full h-[270px]">
          {isMounted ? (
            <>
              {/* Left Y-Axis */}
              <div className="flex-none" style={{ width: 80 }}>
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart 
                    accessibilityLayer 
                    data={data} 
                    syncId="netWorthSync" 
                    margin={{ ...chartMargin, right: 0, left: 20, bottom: xAxisHeight }}
                  >
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      stroke="var(--color-netWorth)" 
                      tickFormatter={(value) => yAxisFormatter(Number(value), locale, currency)}
                      width={60}
                    />
                    {/* Hidden area to sync scale */}
                    <Area yAxisId="left" dataKey="netWorth" fill="none" stroke="none" activeDot={false} />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Scrollable Main Chart */}
              <ScrollArea className="flex-grow whitespace-nowrap overflow-y-hidden">
                <div style={{ width: `${minWidth}px`, height: '100%' }}>
                  <ChartContainer config={chartConfig} className="h-full w-full">
                    <AreaChart 
                      accessibilityLayer 
                      data={data} 
                      syncId="netWorthSync"
                      margin={{ ...chartMargin, left: 0, right: 30 }}
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
                      <Tooltip
                          cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                          content={<ChartTooltipContent 
                              formatter={(value) => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value))}
                              indicator="dot"
                          />}
                      />
                      <Legend content={<ChartLegendContent />} />
                      <Area yAxisId="left" dataKey="netWorth" name="netWorth" type="natural" fill="url(#fillNetWorth)" stroke="var(--color-netWorth)" />
                      <Area yAxisId="right" dataKey="cashFlow" name="cashFlow" type="natural" fill="url(#fillCashFlow)" stroke="var(--color-cashFlow)" />
                    </AreaChart>
                  </ChartContainer>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>

              {/* Right Y-Axis */}
              <div className="flex-none" style={{ width: 80 }}>
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <AreaChart 
                    accessibilityLayer 
                    data={data} 
                    syncId="netWorthSync" 
                    margin={{ ...chartMargin, left: 0, right: 20, bottom: xAxisHeight }}
                  >
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="var(--color-cashFlow)" 
                      tickFormatter={(value) => yAxisFormatter(Number(value), locale, currency)}
                      width={60}
                    />
                     {/* Hidden area to sync scale */}
                    <Area yAxisId="right" dataKey="cashFlow" fill="none" stroke="none" activeDot={false} />
                  </AreaChart>
                </ChartContainer>
              </div>
            </>
          ) : (
            <div className="h-full w-full" />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
