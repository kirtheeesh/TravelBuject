# BkTravel Budget Manager

## Overview

BkTravel Budget Manager is a modern web application designed to help users plan, track, and split travel expenses with friends and groups. The application features a travel-first visual aesthetic with playful, approachable interfaces for serious budget tracking. Users can create trips, add members, track expenses across categories, and automatically split costs among selected participants.

**Key Features:**
- Trip and budget creation with member management
- Expense tracking across multiple categories (Food, Accommodation, Transport, etc.)
- Flexible expense splitting among selected trip members
- Real-time updates and data synchronization
- PDF export functionality for trip summaries
- Google OAuth authentication with explore mode for anonymous usage
- Mobile-optimized responsive design

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Framework:**
- Shadcn UI component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Custom color system with CSS variables for theming support
- Typography using Inter (UI) and Poppins (display) font families from Google Fonts

**State Management:**
- Context API for authentication state (AuthContext)
- TanStack Query for server state and data fetching
- Local storage for explore mode (anonymous) trip data
- Session-based state for real-time data subscriptions

**Design System:**
- Mobile-first responsive design with specific breakpoints
- Consistent spacing scale (8px base unit)
- Component variants using class-variance-authority
- Hover and active state elevations for interactive elements

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server and API routing
- Node.js runtime with ES modules
- Session-based authentication using express-session with MemoryStore
- CORS configured for cross-origin requests with credentials support

**API Design:**
- RESTful API endpoints under `/api` prefix
- Protected routes using ensureAuth middleware
- Session-based user authentication
- Health check endpoint for monitoring

**Authentication Flow:**
- Google OAuth 2.0 for user authentication via `@react-oauth/google`
- Server-side token verification using Google's userinfo API
- Session management with cookies for authenticated state
- Explore mode allowing anonymous usage with local storage persistence

### Data Storage

**Database:**
- MongoDB as the primary database
- MongoDB Node.js driver for database operations
- Collections: users, trips, budgetItems
- Document-based schema with embedded relationships

**Schema Design:**
- **Users:** Email, name, creation timestamp
- **Trips:** User ID, trip name, members array, creation timestamp
- **Budget Items:** Trip ID, item name, amount, category, member IDs array, creation timestamp
- Members stored as embedded documents within trips with auto-generated colors

**Data Operations:**
- CRUD operations abstracted in `mongodb-operations.ts`
- Real-time subscription pattern for data updates
- Optimistic updates with query invalidation

### External Dependencies

**Third-Party Services:**
- **Google OAuth:** User authentication and profile information
- **MongoDB:** Cloud database service (connection via MONGODB_URI environment variable)
- **Google Fonts:** Inter and Poppins font families for typography

**Key Libraries:**
- **@react-oauth/google:** Google authentication integration
- **mongodb:** MongoDB database driver
- **jsPDF:** PDF generation for trip summaries and exports
- **recharts:** Chart visualization for budget analytics
- **zod:** Runtime type validation and schema definitions
- **react-hook-form:** Form state management with validation
- **date-fns:** Date formatting and manipulation

**Development Tools:**
- **TypeScript:** Static type checking across the stack
- **Drizzle Kit:** Database schema management (configured but potentially not actively used)
- **ESBuild:** Production build bundling for server code
- **Vite plugins:** Development enhancements for Replit environment

**Environment Variables:**
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `MONGODB_URI`: MongoDB connection string
- `ALLOWED_ORIGINS`: CORS allowed origins for production
- `NODE_ENV`: Environment mode (development/production)
- `DATABASE_URL`: PostgreSQL connection (configured in Drizzle config but MongoDB is primary database)

**Deployment Considerations:**
- Application designed for Replit deployment with specific plugins
- Production build separates client (Vite) and server (ESBuild) bundling
- Static files served from `dist/public` directory
- Server entry point at `dist/index.js`