import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Dot,
} from "recharts";
import { useMemo, useRef, useEffect } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";

const yAxisFormatter = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
};

const tooltipFormatter = (value: unknown) => {
  if (typeof value === "number") {
    const formattedValue = new Intl.NumberFormat("es-ES", {
      style: "decimal",
      maximumFractionDigits: 0,
    }).format(Math.round(value));
    return `${formattedValue}€`;
  }
  return null;
};

const chartConfig = {
  value: {
    label: "Valor",
    color: "hsl(var(--chart-1))",
  },
};

interface HistoryChartProps {
  data: { date: string; value: number }[];
}

const CustomizedDot = (props: any) => {
  const { cx, cy, stroke } = props;
  return (
    <Dot cx={cx} cy={cy} r={4} stroke={stroke} strokeWidth={2} fill="#fff" />
  );
};

export function HistoryChart({ data }: HistoryChartProps) {
  const filteredData = useMemo(() => {
    if (!data) return [];

    const now = new Date();
    const cutoff = new Date(now);

    // Fixed 6 months view
    cutoff.setMonth(cutoff.getMonth() - 6);

    if (cutoff.getDate() !== now.getDate()) {
      cutoff.setDate(0);
    }
    cutoff.setHours(0, 0, 0, 0);

    return data.filter((item) => {
      const [day, month, year] = item.date.split("/").map(Number);
      const itemDate = new Date(
        year < 100 ? 2000 + year : year,
        month - 1,
        day
      );
      return itemDate >= cutoff;
    });
  }, [data]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemWidth = 80;
  const minChartWidth = 300;
  const calculatedWidth = filteredData.length * itemWidth;
  const chartWidth = Math.max(calculatedWidth, minChartWidth);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft =
          scrollContainerRef.current.scrollWidth;
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [filteredData]);

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-none">
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <p>No hi ha prou dades per mostrar el gràfic.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardDescription>Evolució històrica (últims 6 mesos)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <div style={{ display: "flex", height: "100%", width: "100%" }}>
            <div style={{ flex: "0 0 40px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  syncId="syncChartHist"
                  margin={{ top: 10, right: 0, bottom: 20, left: 0 }}
                >
                  <YAxis
                    yAxisId="left"
                    tickFormatter={yAxisFormatter}
                    stroke="#888888"
                    axisLine={{ stroke: "var(--color-value)" }}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip content={() => null} cursor={false} />
                  <Area
                    yAxisId="left"
                    dataKey="value"
                    stroke="none"
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div
              ref={scrollContainerRef}
              style={{
                flex: "1 1 auto",
                overflowX: "auto",
                overflowY: "hidden",
              }}
            >
              <div style={{ width: `${chartWidth}px`, height: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredData}
                    syncId="syncChartHist"
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
                      content={
                        <ChartTooltipContent
                          formatter={tooltipFormatter}
                          indicator="dot"
                        />
                      }
                    />
                    <YAxis yAxisId="left" hide={true} />
                    <Area
                      yAxisId="left"
                      dataKey="value"
                      type="linear"
                      fill="var(--color-value)"
                      fillOpacity={0.4}
                      stroke="var(--color-value)"
                      dot={<CustomizedDot />}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
