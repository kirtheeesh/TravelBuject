# BkTravel Budget Manager

## Overview

BkTravel Budget Manager is a collaborative travel expense tracking application designed to help travelers manage budgets and split costs with companions. The application enables users to create trips, track expenses by category, visualize spending patterns, and fairly distribute costs among group members. Users authenticate via Google OAuth, can invite members to trips through join codes, and access their travel budgets from any device.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Type
Full-stack web application with a monorepo structure combining React frontend and Express backend, using Vite for build tooling and MongoDB for data persistence.

### Frontend Architecture

**UI Framework**: React 18 with TypeScript for type safety, using functional components and hooks exclusively.

**Routing**: Client-side routing via Wouter, a lightweight React Router alternative.

**State Management**: 
- React Query (TanStack Query) for server state with infinite stale time and disabled auto-refetch
- React Context API for authentication state
- Local component state for UI interactions

**UI Component System**: Shadcn/ui components built on Radix UI primitives, providing accessible, customizable components with Tailwind CSS styling.

**Design System**:
- Typography: Inter (UI elements) and Poppins (headings/display) fonts from Google Fonts
- Color system: HSL-based with CSS custom properties for theming
- Spacing: Tailwind's standard scale (8px base unit)
- Component styling: Utility-first approach with Tailwind CSS

**Visualization**: Recharts library for pie charts, bar charts, and expense analytics.

**Authentication Flow**: Google OAuth 2.0 integration with @react-oauth/google, session management via Express sessions.

**Explore Mode**: Offline-first capability allowing users to create and manage trips locally before signing in, with seamless migration to cloud storage upon authentication.

### Backend Architecture

**Runtime**: Node.js with Express framework

**Language**: TypeScript with ES modules

**API Design**: RESTful endpoints following resource-based patterns:
- `/api/trips` - Trip CRUD operations
- `/api/trips/:id/budget-items` - Budget management
- `/api/trips/:id/spending-items` - Spending tracking
- `/api/trips/:id/members` - Member management
- `/api/auth/*` - Authentication endpoints

**Session Management**: Express-session with MemoryStore (development) storing user sessions with httpOnly cookies.

**Authentication Strategy**: 
- Google OAuth token verification via googleapis
- Session-based authentication with userId stored in session
- CORS configured for credentials with allowed origins

**Data Layer**: MongoDB operations abstracted through a custom storage layer with typed collections for trips, budget items, spending items, and users.

### Data Model

**Collections**:
- `users`: User profiles (email, name, creation timestamp)
- `trips`: Trip metadata (name, owner, members, join code)
- `budgetItems`: Planned expenses (name, amount, category, assigned members)
- `spendingItems`: Actual expenses (linked to budget items, completion status)

**Key Relationships**:
- Trips owned by users, contain members array with status (owner/invited/joined)
- Budget items belong to trips, have many-to-many with members
- Spending items optionally reference budget items, track completion
- Members identified by unique IDs with color assignments for UI

**Join Code System**: Each trip has a unique 8-character code enabling invitation links with 24-hour expiry and rate limiting (20 uses/day).

### State Synchronization

**Real-time Updates**: Subscription pattern using MongoDB change streams (planned) with fallback to polling in current implementation.

**Optimistic Updates**: Client-side state updates before server confirmation with rollback on failure.

**Explore Mode Sync**: LocalStorage persistence for offline trips with batch migration on sign-in.

### Security Considerations

**Authentication**: Google OAuth as single sign-on provider, no password storage.

**Session Security**: httpOnly cookies, CSRF protection via SameSite, session expiry handling.

**Authorization**: Middleware (`ensureAuth`) validates session before protected route access, trip ownership verification for mutations.

**CORS Policy**: Environment-based origin allowlist (development allows all, production restricts to deployment URL).

### Build and Deployment

**Development**: Vite dev server with HMR, Express backend on separate process, proxy configuration for API requests.

**Production Build**:
- Frontend: Vite build outputting static assets to `dist/public`
- Backend: esbuild bundling server code to `dist/index.js`
- Single deployment artifact serving static files and API

**Environment Variables**: Database URL, Google OAuth credentials, allowed origins, session secrets.

### Performance Optimizations

**Code Splitting**: React lazy loading for route components with Suspense boundaries.

**Bundle Size**: Current build exceeds 500KB (noted in warnings), candidates for optimization through manual chunking.

**Query Caching**: React Query with infinite stale time reduces redundant API calls.

**Image Assets**: Favicon and static images served from public directory.

### Mobile Responsiveness

**Breakpoints**: Tailwind's default mobile-first breakpoints (768px tablet, 1024px desktop).

**Touch Optimization**: Large tap targets (minimum 44px), thumb-zone navigation, responsive tables with horizontal scroll.

**Viewport**: Meta viewport configured with maximum-scale=1 to prevent zoom on input focus.

## External Dependencies

### Third-Party Services

**Google OAuth 2.0**: User authentication via @react-oauth/google library, requires `VITE_GOOGLE_CLIENT_ID` environment variable.

**MongoDB Database**: Primary data store via @neondatabase/serverless driver (Neon Postgres adapter configured but MongoDB collections used), requires `DATABASE_URL` environment variable.

### Key NPM Packages

**Frontend**:
- `react` & `react-dom`: UI framework
- `@tanstack/react-query`: Server state management
- `wouter`: Routing
- `@react-oauth/google`: Google authentication
- `recharts`: Data visualization
- `@radix-ui/*`: 20+ accessible UI primitives
- `tailwindcss`: Utility-first CSS
- `zod`: Runtime type validation
- `react-hook-form` with `@hookform/resolvers`: Form management
- `jspdf`: PDF generation for expense reports
- `date-fns`: Date manipulation

**Backend**:
- `express`: Web framework
- `express-session`: Session management
- `connect-pg-simple`: PostgreSQL session store (alternative to MemoryStore)
- `cors`: CORS middleware
- `mongodb`: Database driver
- `google-auth-library`: OAuth token verification

**Development**:
- `vite`: Build tool and dev server
- `typescript`: Type checking
- `tsx`: TypeScript execution
- `esbuild`: Production bundler for backend
- `drizzle-kit`: Database migrations (configured but not actively used)
- `@replit/vite-plugin-*`: Replit-specific development tools

### Browser Compatibility

Target browsers defined by Browserslist (data 13 months old per warnings), requires update via `npx update-browserslist-db@latest`.

### Known Issues

**Bundle Size**: Multiple chunks exceed 500KB recommendation, requires code splitting review.

**PostCSS Configuration**: Missing `from` option in plugin configuration may affect source maps.

**Database Configuration**: Drizzle configured for PostgreSQL but application uses MongoDB collections, architectural inconsistency to resolve.

## Recent Changes

### November 11, 2025 - Chatbot Feature Implementation
- **TripChatbot Component**: Created a new internal chatbot component that appears on the dashboard when a trip is loaded
- **Click-Based Interaction**: Chatbot uses predefined selectable options only (no free-text input)
- **Comprehensive Operations Support**: Users can perform all app operations through the chatbot:
  - Budget Management: Add, delete, and view budget items
  - Spending Management: Record spending and view spending items
  - Member Management: Invite, remove, and view trip members
  - Balance & Reports: View spending summary and export PDF reports
  - Trip Settings: Edit trip details and delete trips
- **Accurate Feedback**: Implemented proper error handling and state reflection:
  - Delete operations acknowledge confirmation dialogs before claiming success
  - PDF export properly handles async operations with success/failure states
  - All callbacks propagate errors for accurate user feedback
- **UI Integration**: Chatbot appears as a floating button at bottom-right corner of dashboard, opens chat interface on click