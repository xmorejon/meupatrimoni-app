"use client";

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
import { useMemo, useRef, useEffect, useState } from "react";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFirestore, doc, onSnapshot } from "firebase/firestore";
import { getApp } from "firebase/app";

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
  itemId?: string;
  itemType?: "Bank" | "Debt" | "Asset";
}

const CustomizedDot = (props: any) => {
  const { cx, cy, stroke } = props;
  return (
    <Dot cx={cx} cy={cy} r={4} stroke={stroke} strokeWidth={2} fill="#fff" />
  );
};

export function HistoryChart({ data, itemId, itemType }: HistoryChartProps) {
  const [movements, setMovements] = useState<any[]>([]);

  useEffect(() => {
    if (!itemId || !itemType) {
      setMovements([]);
      return;
    }

    let collectionName = "bankMovements";
    if (itemType === "Debt") {
      collectionName = "debtMovements";
    } else if (itemType === "Asset") {
      collectionName = "assetMovements";
    }

    try {
      const app = getApp();
      const db = getFirestore(app);
      const unsub = onSnapshot(
        doc(db, collectionName, itemId),
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            setMovements(docSnapshot.data().movements || []);
          } else {
            setMovements([]);
          }
        },
      );
      return () => unsub();
    } catch (error) {
      console.error("Error connecting to Firestore:", error);
    }
  }, [itemId, itemType]);

  const filteredData = useMemo(() => {
    if (!data) return [];

    // Deduplicate data: keep only the last entry for each date
    const uniqueDataMap = new Map<string, { date: string; value: number }>();
    data.forEach((item) => {
      uniqueDataMap.set(item.date, item);
    });
    const uniqueData = Array.from(uniqueDataMap.values());

    const now = new Date();
    const cutoff = new Date(now);

    // Fixed 6 months view
    cutoff.setMonth(cutoff.getMonth() - 6);

    if (cutoff.getDate() !== now.getDate()) {
      cutoff.setDate(0);
    }
    cutoff.setHours(0, 0, 0, 0);

    return uniqueData.filter((item) => {
      const [day, month, year] = item.date.split("/").map(Number);
      const itemDate = new Date(
        year < 100 ? 2000 + year : year,
        month - 1,
        day,
      );
      return itemDate >= cutoff;
    });
  }, [data]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemWidth = 70;
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

  const hasData = data && data.length > 0;

  return (
    <div className="flex flex-col min-h-0 space-y-6 overflow-hidden">
      {hasData ? (
        <ChartContainer
          config={chartConfig}
          className="h-[220px] w-full overflow-hidden"
        >
          <div className="flex h-full min-h-0">
            {/* Fixed Y-axis */}
            <div className="w-[42px] flex-shrink-0 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={filteredData}
                  syncId="syncChartHist"
                  margin={{ top: 0, right: 0, bottom: 50, left: 0 }}
                >
                  <YAxis
                    yAxisId="left"
                    tickFormatter={yAxisFormatter}
                    axisLine={false}
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

            {/* Scrollable chart */}
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto overflow-y-hidden h-full min-h-0"
            >
              <div
                style={{ width: chartWidth, height: "100%" }}
                className="h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredData}
                    syncId="syncChartHist"
                    margin={{ top: 10, right: 0, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <Tooltip
                      cursor
                      content={
                        <ChartTooltipContent
                          formatter={tooltipFormatter}
                          indicator="dot"
                        />
                      }
                    />
                    <YAxis yAxisId="left" hide />
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
      ) : (
        <div className="h-[220px] flex items-center justify-center border rounded-md bg-muted/10">
          <p className="text-muted-foreground">
            No hi ha prou dades per mostrar el gràfic.
          </p>
        </div>
      )}
      {movements.length > 0 && (
        <span className="text-sm leading-none p-0 m-0 text-gray-400">
          Últims 20 moviments:
        </span>
      )}
      {movements.length > 0 && (
        <div className="flex-1 h-full max-h-[80vh] overflow-auto border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descripció</TableHead>
                <TableHead className="text-right">Import</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.map((movement, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {new Date(movement.timestamp).toLocaleDateString("ca-ES")}
                  </TableCell>
                  <TableCell>{movement.description}</TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat("ca-ES", {
                      style: "currency",
                      currency: movement.currency || "EUR",
                    }).format(movement.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
