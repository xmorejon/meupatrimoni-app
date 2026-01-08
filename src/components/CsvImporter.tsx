'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { auth, getBankBreakdown, getDebtBreakdown, getAssetBreakdown } from '../lib/firebase-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BankStatus, Debt, Asset } from '@/lib/types';

export function CsvImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [entities, setEntities] = useState<(BankStatus | Debt | Asset)[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchEntities() {
      try {
        const [banks, debts, assets] = await Promise.all([
          getBankBreakdown(),
          getDebtBreakdown(),
          getAssetBreakdown(),
        ]);
        setEntities([...banks, ...debts, ...assets]);
      } catch (error) {
        console.error("Error fetching entities:", error);
        toast({
          title: "Error",
          description: "Could not fetch your accounts. Please try again later.",
          variant: "destructive",
        });
      }
    }
    fetchEntities();
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file || !selectedEntity) {
      toast({
        title: "Error",
        description: "Please select a file and an account to import into.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result;
      if (typeof csvData !== 'string') {
        toast({
          title: "Error",
          description: "Could not read the file.",
          variant: "destructive",
        });
        setImporting(false);
        return;
      }

      try {
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) {
          throw new Error("User not authenticated.");
        }

        const [entityType, entityId] = selectedEntity.split('-');

        const token = await user.getIdToken();

        const response = await fetch('https://europe-west1-meupatrimoni-app.cloudfunctions.net/importCsv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ csvData, entityId, entityType }),
        });

        const data = await response.json();

        if (response.ok) {
          toast({
            title: "Success",
            description: data.message || "CSV data imported successfully.",
          });
        } else {
          throw new Error(data.message || "Failed to import CSV data.");
        }
      } catch (error) {
        console.error("Error importing CSV:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
        toast({
            title: "Error",
            description: "Failed to read the file.",
            variant: "destructive",
        });
        setImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="entity-select" className="block text-sm font-medium text-gray-700">
          Select Account/Asset
        </label>
        <Select onValueChange={setSelectedEntity} value={selectedEntity || ''}>
          <SelectTrigger id="entity-select">
            <SelectValue placeholder="Select an account or asset" />
          </SelectTrigger>
          <SelectContent>
            {entities.map((entity) => (
              <SelectItem key={entity.id} value={`${(entity as BankStatus).institution ? 'Bank' : (entity as Debt).institution ? 'Debt' : 'Asset'}-${entity.id}`}>
                {entity.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700">
          Select CSV file
        </label>
        <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} className="mt-1" />
      </div>
      <Button onClick={handleImport} disabled={importing || !file || !selectedEntity}>
        {importing ? 'Importing...' : 'Import CSV'}
      </Button>
    </div>
  );
}
