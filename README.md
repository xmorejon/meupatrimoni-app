# MeuPatrimoni - Net Worth Tracker

MeuPatrimoni is a modern web application designed to help you track your personal net worth in real-time. It provides a comprehensive dashboard with charts and breakdowns of your financial status, including assets, debts, and cash flow.

![MeuPatrimoni Screenshot](https://storage.googleapis.com/meupatrimoni-app.appspot.com/meupatrimoni-screenshot.png)

## ✨ Features

- **Real-time Dashboard:** View your total net worth, daily change, and current cash flow.
- **Historical Chart:** Visualize the evolution of your net worth and cash flow over the last 30 days.
- **Detailed Breakdowns:** Add, edit, and view detailed lists of your bank accounts, debts (credit cards, mortgages), and assets (real estate, vehicles).
- **Persistent Data:** All data is securely stored and managed using Firebase Firestore.
- **Internationalization:** The app is available in English, Spanish, and Catalan.

## 🚀 Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Hosting:** [Firebase App Hosting](https://firebase.google.com/docs/hosting)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Internationalization:** `next-intl`

## 🏁 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v20 or later)
- Firebase CLI

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/meupatrimoni-app.git
   cd meupatrimoni-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Firebase:**
   - Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
   - During setup, set the Project ID to `meupatrimoni-app`.
   - In your project, go to **Build > Firestore Database** and create a new database. Start in **test mode** for development.
   - Navigate to **Project Settings > Your apps**. Create a new "Web" app.
   - Copy the `firebaseConfig` object.

4. **Configure Environment Variables:**
   - In the root of your project, find the `src/firebase/config.ts` file.
   - Replace the placeholder values in the `firebaseConfig` object with the ones you copied from your Firebase project.

### Running the Development Server

Once the setup is complete, you can run the application locally:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

##  scripts

- `dev`: Starts the Next.js development server.
- `build`: Creates a production build of the application.
- `start`: Starts the production server.
- `lint`: Lints the codebase using Next.js's built-in ESLint configuration.

## ☁️ Deployment

This application is configured for easy deployment with **Firebase App Hosting**.

To deploy your application, run the following command and follow the prompts:

```bash
firebase deploy
```
