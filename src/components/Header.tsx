import type { FC } from 'react';
import { DollarSign, Upload } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';

interface HeaderProps {
    title: string;
}

export const Header: FC<HeaderProps> = ({ title }) => {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:px-8">
      <div className="flex items-center gap-2">
        <DollarSign className="h-6 w-6 text-primary" />
        <h1 className="font-headline text-xl font-semibold text-foreground">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/import">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Link>
        </Button>
      </div>
    </header>
  );
};
