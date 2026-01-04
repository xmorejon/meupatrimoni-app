import Link from 'next/link';
import { MountainIcon } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';

export const Header = () => {
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
        <Link
          href="/import"
          className="text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        >
          Importar
        </Link>
      </nav>
      <UserButton afterSignOutUrl="/" />
    </header>
  );
};
