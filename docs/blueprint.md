# **App Name**: MeuPatrimoni

## Core Features:

- Dashboard Overview: Display a card with the total net worth, calculated as the sum of the latest balances from each unique bank in Firestore.
- Historical Chart: Show an area chart (using Recharts) displaying the evolution of the total net worth over time, fetched from Firestore.
- Bank Breakdown: Present a table or set of cards showing the latest balance for each bank and the last updated timestamp, retrieved from Firestore.
- Real-time Updates: Implement a real-time listener using `onSnapshot` to update the dashboard automatically upon new email parsing by a Cloud Function and its insertion in Firestore.
- Manual Entry: Include a button/modal to manually input a bank balance for edge cases, which writes directly to Firestore.
- Data Persistence: Store financial data, including bank names, timestamps, and balances, securely in Firestore.

## Style Guidelines:

- Primary color: Deep midnight blue (#2C3E50) to evoke a sense of trust and financial stability.
- Background color: Dark slate gray (#34495E), creating a professional, dark-mode aesthetic.
- Accent color: Teal (#1ABC9C) to highlight key metrics and interactive elements.
- Body and headline font: 'Inter' for a modern, neutral, and easily readable style.
- Utilize Lucide-react icons for a clean, consistent, and modern look throughout the application.
- Employ a responsive grid layout using Tailwind CSS to ensure a seamless experience across different screen sizes.
- Incorporate subtle transition animations to provide a smooth user experience.