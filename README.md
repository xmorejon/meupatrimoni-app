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

### Required Firestore Indexes

To ensure the CSV import functionality works correctly, you must create the following composite indexes in your Firestore database:

1.  **Go to the Firestore Indexes Page:** Navigate to the "Indexes" tab in your Firestore database.
2.  **Create Three Separate Indexes:** Create a new index for each of the following configurations:
    - **Index 1 (for Banks):**
      - **Collection ID:** `balanceEntries`
      - **Fields to index:**
        1.  `bankId` -> `Ascending`
        2.  `timestamp` -> `Ascending`
      - **Query scope:** `Collection`

    - **Index 2 (for Debts):**
      - **Collection ID:** `debtEntries`
      - **Fields to index:**
        1.  `debtId` -> `Ascending`
        2.  `timestamp` -> `Ascending`
      - **Query scope:** `Collection`

    - **Index 3 (for Assets):**
      - **Collection ID:** `assetEntries`
      - **Fields to index:**
        1.  `assetId` -> `Ascending`
        2.  `timestamp` -> `Ascending`
      - **Query scope:** `Collection`

### Running the Development Server

Once the setup is complete, you can run the application locally:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) with your browser to see the result.

## 👁️ Preview Mode

This application includes a preview mode that allows you to test its functionality in a sandboxed environment without affecting your production data. This is particularly useful for testing new features or debugging issues.

To use the preview mode, you will need to create a dedicated user account in your Firebase project and add its credentials to a local environment file.

### Setting Up a Preview User

1.  **Enable Email/Password Authentication:**
    - Go to your Firebase project's **Authentication** section.
    - In the **Sign-in method** tab, enable the **Email/Password** provider.

2.  **Create a New User:**
    - In the **Users** tab, click **Add user**.
    - Enter an email and password for your preview user.

3.  **Authorize the Preview User:**
    - Go to your **Firestore Database**.
    - In the `authorized_users` collection, add a new document with the email of your preview user.

4.  **Authorize the Development Domain:**
    - **Go to the Firebase Console:** Open your project and navigate to the **Authentication** section.
    - **Go to the Settings Tab:** Click on the **Settings** tab.
    - **Add the Domain:** Under the "Authorized domains" section, click **Add domain**.
    - **Enter the Domain:** Enter the domain of your development environment. For example:
      `9000-firebase-studio-1767299015901.cluster-fbfjltn375c6wqxlhoehbz44sk.cloudworkstations.dev`
    - **Click Add.**

### Configuring Preview Mode

1.  **Create a `.env.local` File:**
    - In the root of your project, create a new file named `.env.local`.

2.  **Add Environment Variables:**
    - Add the following environment variables to the `.env.local` file, replacing the placeholder values with the credentials of your preview user:

      ```
      NEXT_PUBLIC_PREVIEW_MODE=true
      NEXT_PUBLIC_PREVIEW_EMAIL=your-preview-email@example.com
      NEXT_PUBLIC_PREVIEW_PASSWORD=your-preview-password
      ```

### Running in Preview Mode

Once you have configured the `.env.local` file, you can run the application in preview mode:

```bash
npm run dev
```

The application will automatically sign in with your preview user, and you will be able to test its full functionality.

## scripts

- `dev`: Starts the Next.js development server.
- `build`: Creates a production build of the application.
- `start`: Starts the production server.
- `lint`: Lints the codebase using Next.js's built-in ESLint configuration.

## ☁️ Deployment

This application is configured for easy deployment with **Firebase App Hosting**.

To deploy your application, run the following command and follow the prompts:

Hosting:

> **⚠️ Important:** Ensure `NEXT_PUBLIC_PREVIEW_MODE` is set to `false` in your `.env.local` file before building, or the deployed version will bypass authentication.

"npm run build" in the root path
"firebase deploy --only hosting" in the root path

Functions:
"npm run build" in the functions folder
"firebase deploy --only functions" in the root path
