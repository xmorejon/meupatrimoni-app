
"use client";

import type { FC } from 'react';
import { useRef, useEffect } from 'react';
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
    if (isNaN(number)) return '';
    if (number >= 1000000 || number <= -1000000) {
        return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(number/1000000)}M`;
    }
    if (number >= 1000 || number <= -1000) {
        return `${new Intl.NumberFormat(locale, { style: 'currency', currency, notation: 'compact', compactDisplay: 'short' }).format(number/1000)}k`;
    }
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(number);
};

const CHART_HEIGHT = 250;
const LEFT_YAXIS_WIDTH = 65;
const RIGHT_YAXIS_WIDTH = 65;

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollableViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (scrollableViewport) {
            scrollableViewport.scrollLeft = scrollableViewport.scrollWidth;
        }
    }
  }, [data]);
  
  const yDomain = [
    (dataMin: number) => (dataMin > 0 ? dataMin * 0.95 : dataMin * 1.05),
    (dataMax: number) => (dataMax > 0 ? dataMax * 1.05 : dataMax * 0.95),
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-end">
            {/* Left Y-Axis */}
            <div style={{ width: `${LEFT_YAXIS_WIDTH}px`, height: `${CHART_HEIGHT}px` }}>
                <ChartContainer config={chartConfig} className="h-full w-full p-0 m-0">
                    <AreaChart accessibilityLayer data={data} margin={{ top: 5, right: 0, left: 0, bottom: 26 }}>
                        <YAxis 
                            yAxisId="left" 
                            orientation="left"
                            domain={yDomain}
                            stroke="hsl(var(--primary))"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={5}
                            tickFormatter={(value) => yAxisFormatter(value, locale, currency)}
                            style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                        />
                    </AreaChart>
                </ChartContainer>
            </div>
            
            {/* Main Scrollable Chart */}
            <div className="flex-grow">
                <ScrollArea ref={scrollAreaRef} className="w-full whitespace-nowrap">
                    <div style={{ width: `${minWidth}px`, height: `${CHART_HEIGHT}px` }}>
                        <ChartContainer config={chartConfig} className="h-full w-full p-0 m-0">
                            <AreaChart accessibilityLayer data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
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
                                    interval="preserveStartEnd"
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
                                <Area yAxisId="left" dataKey="netWorth" type="natural" fill="url(#fillNetWorth)" stroke="var(--color-netWorth)" stackId="a" />
                                <Area yAxisId="right" dataKey="cashFlow" type="natural" fill="url(#fillCashFlow)" stroke="var(--color-cashFlow)" stackId="b" />
                            </AreaChart>
                        </ChartContainer>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>

            {/* Right Y-Axis */}
            <div style={{ width: `${RIGHT_YAXIS_WIDTH}px`, height: `${CHART_HEIGHT}px` }}>
                <ChartContainer config={chartConfig} className="h-full w-full p-0 m-0">
                    <AreaChart accessibilityLayer data={data} margin={{ top: 5, right: 0, left: 0, bottom: 26 }}>
                         <YAxis 
                            yAxisId="right" 
                            orientation="right"
                            domain={yDomain}
                            stroke="hsl(var(--chart-2))"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={5}
                            tickFormatter={(value) => yAxisFormatter(value, locale, currency)}
                            style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }}
                        />
                    </AreaChart>
                </ChartContainer>
            </div>
        </div>
      </CardContent>
    </Card>
  );
};
