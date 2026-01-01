import type { FC } from 'react';
import { DollarSign } from 'lucide-react';

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
    </header>
  );
};
