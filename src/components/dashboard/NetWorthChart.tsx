
"use client";

import { type FC } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltipContent, ChartLegendContent } from '@/components/ui/chart';
import type { ChartDataPoint } from '@/lib/types';

interface NetWorthChartProps {
  data: ChartDataPoint[];
}

const yAxisFormatter = (value: number) => {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
};

export const NetWorthChart: FC<NetWorthChartProps> = ({ data }) => {
    const chartConfig = {
      netWorth: {
        label: "Patrimoni Net",
        color: "hsl(var(--chart-1))",
      },
      cashFlow: {
        label: "Cash Flow",
        color: "hsl(var(--chart-2))",
      },
    } satisfies ChartConfig

    return (
        <Card>
          <CardHeader>
            <CardTitle>Patrimoni Net i Cash Flow</CardTitle>
            <CardDescription>El teu patrimoni net i cash flow al llarg del temps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px] w-full">
              {data && data.length > 0 ? (
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ left: 12, right: 20, top: 10, bottom:10 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                          />
                          <YAxis
                              yAxisId="left"
                              tickFormatter={yAxisFormatter}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={yAxisFormatter}
                          />
                           <Tooltip
                              content={
                                <ChartTooltipContent
                                    formatter={yAxisFormatter}
                                    indicator="dot"
                                />
                              }
                            />
                          <Legend content={<ChartLegendContent />} />
                          <Area 
                            yAxisId="left" 
                            dataKey="netWorth" 
                            type="natural" 
                            fill="var(--color-netWorth)" 
                            fillOpacity={0.4} 
                            stroke="var(--color-netWorth)" 
                          />
                          <Area 
                            yAxisId="right" 
                            dataKey="cashFlow" 
                            type="natural" 
                            fill="var(--color-cashFlow)" 
                            fillOpacity={0.4} 
                            stroke="var(--color-cashFlow)" 
                          />
                        </AreaChart>
                    </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-full w-full" />
              )}
            </div>
          </CardContent>
        </Card>
      );
    };
