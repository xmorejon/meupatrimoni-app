
"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Dot } from "recharts"
import { useRef, useEffect } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartDataPoint } from "@/lib/types"

const yAxisFormatter = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(0)}k`
    }
    return value.toString()
}

const tooltipFormatter = (value: unknown) => {
    if (typeof value === 'number') {
        const formattedValue = new Intl.NumberFormat('es-ES', {
            style: 'decimal',
            maximumFractionDigits: 0,
        }).format(Math.round(value));
        return `${formattedValue}€`;
    }
    return null;
};

const chartConfig = {
    netWorth: {
      label: "Patrimoni Net",
      color: "hsl(var(--chart-1))",
    },
    cashFlow: {
      label: "Capital disponible",
      color: "hsl(var(--chart-2))",
    },
}

interface NetWorthChartProps {
    data: ChartDataPoint[];
}

const CustomizedDot = (props: any) => {
  const { cx, cy, stroke, payload } = props;

  if (payload.hasChange) {
    return (
      <Dot cx={cx} cy={cy} r={4} stroke={stroke} strokeWidth={2} fill="#fff" />
    );
  }

  return null;
};

export function NetWorthChart({ data }: NetWorthChartProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const itemWidth = 80;
    const minChartWidth = 500;
    const calculatedWidth = data.length * itemWidth;
    const chartWidth = Math.max(calculatedWidth, minChartWidth);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <Card>
              <CardHeader>
                <CardTitle>Patrimoni Net i Capital disponible</CardTitle>
                <CardDescription>El teu patrimoni net i capital disponible al llarg del temps</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px] flex items-center justify-center">
                  <p>No hi ha prou dades per mostrar el gràfic.</p>
                </div>
              </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Patrimoni Net i Capital disponibe</CardTitle>
                <CardDescription>El teu patrimoni net i capital disponible al llarg del temps</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <div style={{ display: 'flex', height: '100%', width: '100%' }}>

                    {/* Left Y-Axis Chart */}
                    <div style={{ flex: '0 0 70px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data}
                                syncId="syncChart"
                                margin={{ top: 10, right: 0, bottom: 20, left: 10 }}
                            >
                                <YAxis
                                    yAxisId="left"
                                    tickFormatter={yAxisFormatter}
                                    stroke="#888888"
                                    axisLine={{ stroke: "var(--color-netWorth)" }}
                                    tickLine={false}
                                />
                                <Tooltip content={() => null} cursor={false} />
                                <Area yAxisId="left" dataKey="netWorth" stroke="none" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Scrollable Main Chart */}
                    <div 
                        ref={scrollContainerRef}
                        style={{ flex: '1 1 auto', overflowX: 'auto', overflowY: 'hidden' }}
                    >
                        <div style={{ width: `${chartWidth}px`, height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={data}
                                    syncId="syncChart"
                                    margin={{ top: 10, right: 10, bottom: 20, left: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#888888"
                                        tickLine={false}
                                        axisLine={false}
                                        tickMargin={8}
                                    />
                                    <Tooltip
                                        cursor={true}
                                        content={<ChartTooltipContent formatter={tooltipFormatter} indicator="dot" />}
                                    />
                                    <YAxis yAxisId="left" hide={true} />
                                    <YAxis yAxisId="right" hide={true} />
                                    <Area yAxisId="left" dataKey="netWorth" type="linear" fill="var(--color-netWorth)" fillOpacity={0.4} stroke="var(--color-netWorth)" dot={<CustomizedDot />} />
                                    <Area yAxisId="right" dataKey="cashFlow" type="linear" fill="var(--color-cashFlow)" fillOpacity={0.4} stroke="var(--color-cashFlow)" dot={<CustomizedDot />} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right Y-Axis Chart */}
                    <div style={{ flex: '0 0 70px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data}
                                syncId="syncChart"
                                margin={{ top: 10, right: 10, bottom: 20, left: 0 }}
                            >
                                <YAxis
                                    yAxisId="right"
                                    orientation="right"
                                    tickFormatter={yAxisFormatter}
                                    stroke="#888888"
                                    axisLine={{ stroke: "var(--color-cashFlow)" }}
                                    tickLine={false}
                                />
                                <Tooltip content={() => null} cursor={false} />
                                <Area yAxisId="right" dataKey="cashFlow" stroke="none" fill="none" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
              </ChartContainer>
              {/* Manual Legend */}
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
                  <span className="text-sm text-muted-foreground">{chartConfig.netWorth.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                  <span className="text-sm text-muted-foreground">{chartConfig.cashFlow.label}</span>
                </div>
              </div>
            </CardContent>
        </Card>
    );
}
