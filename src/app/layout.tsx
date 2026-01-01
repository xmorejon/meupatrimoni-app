//This is the root layout.
//Since we are using next-intl, we can have a root layout that applies to all locales.
//However, we are creating a `[locale]` folder with its own layout.
//This root layout will just pass the children through.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
