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
    const number = Number(value);
    if (number >= 1000000 || number <= -1000000) {
        return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(number/1000000)}M`;
    }
    if (number >= 1000 || number <= -1000) {
        return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(number/1000)}k`;
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(number);
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

  const minWidth = data.length * 40;
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent className="relative">
         <div className="flex items-end">
            {/* Left Y-Axis */}
            <div className="h-[250px] pr-4">
                <ResponsiveContainer width={80} height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 28 }}>
                        <YAxis
                          yAxisId="left"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => yAxisFormatter(value, locale, currency)}
                          style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                          domain={['dataMin', 'dataMax']}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            {/* Scrollable Chart Area */}
            <div className="flex-1 h-[280px]">
                 <ScrollArea className="w-full whitespace-nowrap h-full">
                  <ChartContainer config={chartConfig} className="h-[250px] w-full" style={{ minWidth: `${minWidth}px`}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => value.substring(0,5)}
                          style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                        />
                         <YAxis yAxisId="left" hide={true} domain={['dataMin', 'dataMax']} />
                         <YAxis yAxisId="right" hide={true} domain={['dataMin', 'dataMax']} />
                        <Tooltip
                          cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                          content={<ChartTooltipContent
                              formatter={(value, name) => (
                                <div className="flex flex-col">
                                    <span className="capitalize">{name.replace(/([A-Z])/g, ' $1')}</span>
                                    <span className="font-bold">{new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Number(value))}</span>
                                </div>
                              )}
                              indicator="dot"
                          />}
                        />
                        <Area
                          yAxisId="left"
                          dataKey="netWorth"
                          type="natural"
                          fill="url(#fillNetWorth)"
                          stroke="var(--color-netWorth)"
                          stackId="a"
                        />
                         <Area
                          yAxisId="right"
                          dataKey="cashFlow"
                          type="natural"
                          fill="url(#fillCashFlow)"
                          stroke="var(--color-cashFlow)"
                          stackId="b"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
             {/* Right Y-Axis */}
             <div className="h-[250px] pl-4">
                <ResponsiveContainer width={80} height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 28 }}>
                         <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(value) => yAxisFormatter(value, locale, currency)}
                          style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                           domain={['dataMin', 'dataMax']}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
         {/* Legend */}
        <div className="flex justify-center -mt-4">
            <ChartContainer config={chartConfig}>
                 <Legend content={<ChartLegendContent />} />
            </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
