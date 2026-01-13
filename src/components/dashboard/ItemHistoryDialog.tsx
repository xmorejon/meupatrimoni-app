"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HistoryChart } from "./HistoryChart";
import { getItemHistory } from "@/lib/firebase-service";
import { Loader2 } from "lucide-react";

interface ItemHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    name: string;
    type: "Bank" | "Debt" | "Asset";
  } | null;
}

export function ItemHistoryDialog({
  isOpen,
  onClose,
  item,
}: ItemHistoryDialogProps) {
  const [data, setData] = useState<{ date: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      getItemHistory(item.type, item.id)
        .then((history) => {
          setData(history);
        })
        .catch((error) => {
          console.error("Failed to fetch item history:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData([]);
    }
  }, [isOpen, item]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Històric: {item?.name}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="h-[350px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <HistoryChart data={data} />
        )}
      </DialogContent>
    </Dialog>
  );
}
