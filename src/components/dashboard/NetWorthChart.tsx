
"use client";

import type { FC } from 'react';
import { useRef, useEffect, useMemo } from 'react';
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
            // scroll to the end so the latest data is visible on load
            // use a short timeout to ensure layout is ready
            setTimeout(() => {
              try {
                const el = scrollableViewport as HTMLElement;
                el.scrollLeft = Math.max(0, el.scrollWidth - el.clientWidth);
              } catch (e) {
                // ignore
              }
            }, 0);
        }
    }
  }, [data]);
  
  const yDomain = [
    (dataMin: number) => (dataMin > 0 ? dataMin * 0.95 : dataMin * 1.05),
    (dataMax: number) => (dataMax > 0 ? dataMax * 1.05 : dataMax * 0.95),
  ];

  const [netMin, netMax, cashMin, cashMax] = useMemo(() => {
    if (!data || data.length === 0) return [0, 0, 0, 0];
    let nmin = Infinity, nmax = -Infinity, cmin = Infinity, cmax = -Infinity;
    data.forEach(d => {
      if (typeof d.netWorth === 'number') {
        nmin = Math.min(nmin, d.netWorth);
        nmax = Math.max(nmax, d.netWorth);
      }
      if (typeof d.cashFlow === 'number') {
        cmin = Math.min(cmin, d.cashFlow);
        cmax = Math.max(cmax, d.cashFlow);
      }
    });
    if (!isFinite(nmin) || !isFinite(nmax)) { nmin = 0; nmax = 0; }
    if (!isFinite(cmin) || !isFinite(cmax)) { cmin = 0; cmax = 0; }
    const nYmin = nmin > 0 ? nmin * 0.95 : nmin * 1.05;
    const nYmax = nmax > 0 ? nmax * 1.05 : nmax * 0.95;
    const cYmin = cmin > 0 ? cmin * 0.95 : cmin * 1.05;
    const cYmax = cmax > 0 ? cmax * 1.05 : cmax * 0.95;
    return [nYmin, nYmax, cYmin, cYmax];
  }, [data]);

  const netTicks = useMemo(() => {
    const min = netMin, max = netMax;
    const count = 4;
    if (min === max) return [min];
    const step = (max - min) / count;
    const t: number[] = [];
    for (let i = 0; i <= count; i++) t.push(min + step * i);
    return t.reverse();
  }, [netMin, netMax]);

  const cashTicks = useMemo(() => {
    const min = cashMin, max = cashMax;
    const count = 4;
    if (min === max) return [min];
    const step = (max - min) / count;
    const t: number[] = [];
    for (let i = 0; i <= count; i++) t.push(min + step * i);
    return t.reverse();
  }, [cashMin, cashMax]);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{translations.title}</CardTitle>
        <CardDescription>{translations.description}</CardDescription>
      </CardHeader>
        <CardContent>
        <div className="w-full flex items-stretch">
            <div className="flex-shrink-0 w-20 pr-2 flex flex-col justify-between text-right">
            {netTicks.map((t, i) => (
              <span key={`l-${i}`} className="text-xs text-muted-foreground">{yAxisFormatter(t, locale, currency)}</span>
            ))}
          </div>
          <ScrollArea ref={scrollAreaRef} className="flex-1">
            <div style={{ width: `${minWidth}px`, height: '250px' }}>
              <ChartContainer config={chartConfig} className="h-full w-full p-0 m-0">
                <AreaChart accessibilityLayer data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                          tickMargin={6}
                          tickFormatter={(value) => String(value)}
                          style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }}
                            interval="preserveStartEnd"
                        />
                        {/* keep YAxes hidden to provide scales while we render visible labels outside the scroll area */}
                        <YAxis yAxisId="left" orientation="left" domain={[netMin, netMax]} hide />
                        <YAxis yAxisId="right" orientation="right" domain={[cashMin, cashMax]} hide />
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
                            {/* Legend is rendered outside the scrollable chart so it stays visible */}
                        <Area yAxisId="left" dataKey="netWorth" type="natural" fill="url(#fillNetWorth)" stroke="var(--color-netWorth)" />
                        <Area yAxisId="right" dataKey="cashFlow" type="natural" fill="url(#fillCashFlow)" stroke="var(--color-cashFlow)" />
                    </AreaChart>
                </ChartContainer>
                </div>
            </ScrollArea>
                <div className="flex-shrink-0 w-20 pl-2 flex flex-col justify-between text-left">
                {cashTicks.map((t, i) => (
                  <span key={`r-${i}`} className="text-xs text-muted-foreground">{yAxisFormatter(t, locale, currency)}</span>
                ))}
              </div>
        </div>
            {/* Fixed legend (curve labels) shown outside the scroll area so they don't scroll */}
            <div className="w-full flex items-center justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-2 rounded-sm border"
                  style={{ backgroundColor: chartConfig.netWorth.color || 'var(--color-netWorth)', borderColor: chartConfig.netWorth.color || 'var(--color-netWorth)' }}
                />
                <span className="text-xs text-muted-foreground">{chartConfig.netWorth.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-4 h-2 rounded-sm border"
                  style={{ backgroundColor: chartConfig.cashFlow.color || 'var(--color-cashFlow)', borderColor: chartConfig.cashFlow.color || 'var(--color-cashFlow)' }}
                />
                <span className="text-xs text-muted-foreground">{chartConfig.cashFlow.label}</span>
              </div>
            </div>
      </CardContent>
    </Card>
  );
};
