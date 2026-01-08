import { useState } from 'react';
import Link from 'next/link';
import { MountainIcon } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { CsvImporter } from '@/components/CsvImporter';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


export const Header = () => {
  const [isCsvImporterOpen, setIsCsvImporterOpen] = useState(false);

  return (
    <header className="flex h-16 w-full items-center justify-between bg-white px-4 md:px-6 shadow-md">
      <Link href="/" className="flex items-center gap-2">
        <MountainIcon className="h-6 w-6" />
        <span className="text-lg font-semibold">Patrimoni</span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
        <Link
          href="/dashboard"
          className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          Panell de Control
        </Link>
        <Dialog open={isCsvImporterOpen} onOpenChange={setIsCsvImporterOpen}>
          <DialogTrigger asChild>
            <Button variant="link" className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50">
              Importar CSV
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Importar CSV</DialogTitle>
            </DialogHeader>
            <CsvImporter />
          </DialogContent>
        </Dialog>
      </nav>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
};
