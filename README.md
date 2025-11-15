# BkTravel Budget Manager

A modern, mobile-friendly travel budget management application that makes it easy to track expenses and split costs with travel companions.

## 🚀 Live Demo

Experience the app now: **[BkTravel Budget Manager](https://bktravelbud.onrender.com/)**

## 📚 Table of Contents
- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running Locally](#running-locally)
  - [Building for Production](#building-for-production)
- [Available Scripts](#available-scripts)
- [Design Philosophy](#design-philosophy)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Browser Support](#browser-support)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

BkTravel Budget Manager is a collaborative expense tracker designed specifically for travelers. Whether you're on a weekend getaway or a month-long adventure, this app helps you and your travel companions organize expenses, split costs fairly, and keep everyone on the same page financially.

## Key Features

- **Trip Management**: Create and organize multiple trips, invite group members, and keep all travel details in one shared space.
- **Expense Tracking**: Log daily expenses with categories, attach notes, and maintain a detailed transaction history.
- **Visual Analytics**: Review expenses at a glance with pie charts, bar charts, and quick summaries of total trip budgets.
- **Smart Cost Splitting**: Split costs evenly, customize by member, and view real-time balances showing who owes whom.
- **Secure Authentication**: Sign in with Google OAuth, benefit from session management, and ensure trip privacy per user.
- **Mobile-Optimized UI**: Enjoy a fully responsive interface that works beautifully on phones, tablets, and desktops.

## Tech Stack

### Frontend
- **React 18** for the interface
- **TypeScript** for type-safe development
- **Vite** for fast builds and hot reloading
- **Tailwind CSS** for utility-first styling
- **Radix UI** and **Lucide React** for accessible, polished components
- **React Hook Form** and **TanStack Query** for form and server state management
- **Recharts** for data visualizations

### Backend
- **Node.js** + **Express.js** for the API
- **Drizzle ORM** with **Neon Database** (PostgreSQL) for data persistence
- **Passport** (Google OAuth) and **express-session** for authentication
- **ws** for real-time updates and collaborative features

### Styling & UI Enhancements
- **Tailwind CSS** + **tailwind-merge** for consistent styles
- **Framer Motion** and **tw-animate-css** for smooth animations
- **Embla Carousel** and **cmdk** for premium UX components

## Project Structure

```text
TravelBuject/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (routes)
│   │   ├── hooks/         # Custom React hooks
│   │   ├── contexts/      # React context providers
│   │   ├── lib/           # Utility functions
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── index.html         # HTML template
│   └── public/            # Static assets
│
├── server/                # Express backend
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API endpoints
│   ├── auth.ts            # Authentication logic
│   ├── db.ts              # Database setup
│   ├── storage.ts         # File storage handling
│   └── vite.ts            # Vite integration
│
├── shared/                # Shared code
│   └── schema.ts          # TypeScript/Zod schemas
│
├── dist/                  # Production build output
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── package.json           # Dependencies and scripts
```

## Usage Guide

1. **Sign In**: Authenticate with Google to access your personalized trip dashboard.
2. **Create a Trip**: Provide trip details (name, description, start/end dates) and invite companions via email.
3. **Set Budgets**: Define the trip budget and categories to organize spending from the start.
4. **Log Expenses**: Add expenses on the go, categorize them, and choose how costs are split among members.
5. **Monitor Analytics**: Review charts and summaries to understand spending patterns and individual balances.
6. **Export & Share**: Generate sharable summaries or export data for post-trip reconciliation.

## Getting Started

### Prerequisites

- Node.js **v18+**
- npm (bundled with Node.js) or Yarn
- PostgreSQL database (Neon hosted URL or local instance)
- Google OAuth Client ID and Client Secret

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TravelBuject
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```

### Environment Variables

Create an `.env` file in the project root and populate the following values:

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Drizzle ORM | `postgresql://user:password@host/db` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `super-secret-value` |
| `SESSION_SECRET` | Key for Express session encryption | `use-a-long-random-string` |
| `PORT` | Server port when running locally | `5000` |
| `NODE_ENV` | Runtime environment flag | `development` |

### Database Setup

1. Ensure the database defined in `DATABASE_URL` exists.
2. Push the latest schema migrations:
   ```bash
   npm run db:push
   ```

### Running Locally

1. Start the development server (Express API + Vite frontend middleware):
   ```bash
   npm run dev
   ```
2. Open the frontend at `http://localhost:5173`.
3. API routes will be proxied through the same development server.

### Building for Production

1. Build both the frontend and backend bundles:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm start
   ```
3. Set `NODE_ENV=production` and configure your hosting provider with the same environment variables listed above.

## Available Scripts

```bash
npm run dev        # Start the development server with hot reload
npm run build      # Bundle the frontend and backend for production
npm start          # Serve the production build
npm run check      # Execute TypeScript type checking
npm run db:push    # Push schema changes to the configured database
```

## Design Philosophy

BkTravel uses a **Travel-First** design approach inspired by:
- **Airbnb**: Travel aesthetics and card-based layouts
- **Splitwise**: Expense splitting and playful interactions
- **Notion**: Clean forms and organizational clarity

The design emphasizes:
- **Wanderlust Visuals**: Travel-focused imagery and themes
- **Playful Precision**: Friendly interface for serious budgeting
- **Collaborative Focus**: Group dynamics and shared experiences
- **Mobile-First**: Optimized for on-the-go access

## Database Schema

The application uses Drizzle ORM with PostgreSQL. Key entities include:
- **Users**: Profiles enriched with Google OAuth data
- **Trips**: Travel journey records and metadata
- **Members**: Trip participants and their roles
- **Budgets**: Expense items and budget categories
- **Splits**: Distribution of costs among members

See `shared/schema.ts` for detailed schema definitions.

## Authentication Flow

1. User initiates the login flow via Google OAuth.
2. Upon successful authentication, an Express session is created.
3. The user is redirected to the home dashboard.
4. Session data persists across page reloads until logout or expiry.
5. Logging out clears the session and secures user data.

## API Endpoints

The Express backend delivers RESTful APIs for:
- Trip management (create, read, update, delete)
- Member invitations and management
- Budget item creation, editing, deletion, and splitting
- User authentication and session management

See `server/routes.ts` for complete endpoint documentation.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

We welcome contributions of any size! To propose changes:

1. Fork the repository and create a new branch based on `main`.
2. Implement your updates with clear commit messages.
3. Run local checks to ensure everything passes:
   ```bash
   npm run check
   ```
4. Test affected features manually (e.g., login, trip creation, expense entry).
5. Open a pull request describing the change, screenshots (if UI), and test notes.
6. Respond to review feedback promptly so we can merge quickly.

## License

MIT — see the `LICENSE` file for full details.

## Support

For issues, questions, or feature suggestions, please open a GitHub issue. We love hearing how BkTravel helps plan your adventures!

---

**Happy Traveling! 🌎✈️**
