# 🌍 BkTravel Budget Manager

A modern, mobile-friendly travel budget management application that makes it easy to track expenses and split costs with travel companions.

## 🚀 Live Demo

Experience the app now: **[BkTravel Budget Manager](https://bktravelbud.onrender.com/)**

## Overview

BkTravel Budget Manager is a collaborative expense tracker designed specifically for travelers. Whether you're on a weekend getaway or a month-long adventure, this app helps you and your travel companions organize expenses, split costs fairly, and keep everyone on the same page financially.

### Key Features

✨ **Trip Management**
- Create and organize multiple trips
- Invite group members to collaborate
- Track all expenses for each trip

💰 **Expense Tracking**
- Log daily expenses with categories
- Automatically split costs among group members
- Detailed expense history with timestamps

📊 **Visual Analytics**
- Pie charts showing expense categories breakdown
- Bar charts displaying per-member spending
- Quick summary of total trip budget

👥 **Smart Cost Splitting**
- Flexible splitting options (equal, custom amounts, per person)
- Real-time balance calculations
- Clear breakdown of who owes whom

🔐 **User Authentication**
- Secure Google OAuth integration
- Session management
- User-specific trip access

📱 **Mobile-Optimized**
- Fully responsive design
- Touch-friendly interface
- Works seamlessly on phones, tablets, and desktops

## Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Unstyled, accessible components
- **Recharts** - Data visualization
- **React Hook Form** - Efficient form management
- **Wouter** - Lightweight routing
- **React Query (TanStack Query)** - Server state management

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime environment
- **Passport** - Authentication middleware (Google OAuth)
- **Drizzle ORM** - Type-safe database queries
- **Neon Database** - PostgreSQL hosting

### Styling & UI
- **Tailwind CSS** - Responsive design system
- **Framer Motion** - Smooth animations
- **Lucide React** - Beautiful icons
- **clsx/tailwind-merge** - Class merging utilities

## Project Structure

```
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
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Pages & Functionality

### 🎬 Splash Page
- Welcome screen with travel-themed hero image
- Call-to-action button to get started
- Entry point for new users

### 🔑 Authentication
- Google OAuth login integration
- Secure session management
- Loading state during authentication

### 🏠 Home Dashboard
- Overview of all trips
- Quick access to trip details
- Create new trip button
- Trip cards with members count and total budget

### ➕ Create Trip
- Form to create a new trip
- Add trip name, description, dates
- Invite members with email
- Budget allocation setup

### 💸 Add Budget Item
- Log daily expenses
- Select category/item type
- Specify amount and split method
- Assign to relevant members
- Real-time balance updates

### 📊 Trip Dashboard
- Comprehensive expense overview
- Expense history table with filtering
- Visual charts (pie & bar graphs)
- Member spending breakdown
- Edit/delete expense options
- Export functionality

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- PostgreSQL database (Neon or local)
- Google OAuth credentials

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

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```
   # Database
   DATABASE_URL=your_neon_database_url

   # Google OAuth
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   # Session
   SESSION_SECRET=your_session_secret

   # Server
   PORT=5000
   NODE_ENV=development
   ```

4. **Push database schema**
   ```bash
   npm run db:push
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload

# Production
npm run build           # Build frontend + backend
npm start               # Start production server

# Utilities
npm run check           # TypeScript type checking
npm run db:push         # Push schema changes to database
```

## Design Philosophy

BkTravel uses a **Travel-First** design approach inspired by:
- **Airbnb** - Travel aesthetics and card-based layouts
- **Splitwise** - Expense splitting and playful interactions
- **Notion** - Clean forms and organizational clarity

The design emphasizes:
- **Wanderlust Visuals** - Travel-focused imagery and themes
- **Playful Precision** - Friendly interface for serious budgeting
- **Collaborative Focus** - Group dynamics and shared experiences
- **Mobile-First** - Optimized for on-the-go access

## Database Schema

The application uses Drizzle ORM with PostgreSQL. Key entities include:
- **Users** - User profiles with Google OAuth info
- **Trips** - Travel journey records
- **Members** - Trip participants
- **Budgets** - Expense items and amounts
- **Splits** - Individual splits for each member

See `shared/schema.ts` for detailed schema definitions.

## Authentication Flow

1. User clicks login
2. Redirected to Google OAuth
3. After authentication, session is established
4. User is redirected to home dashboard
5. Session persists across page reloads
6. Logout clears session

## API Endpoints

The Express backend provides RESTful APIs for:
- Trip management (create, read, update, delete)
- Member management
- Budget item creation and splitting
- User authentication
- Session management

See `server/routes.ts` for complete endpoint documentation.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

Contributions are welcome! Please follow these guidelines:
1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT - See LICENSE file for details

## Support

For issues, questions, or suggestions, please open an issue on the repository.

---

**Happy Traveling! 🌎✈️**