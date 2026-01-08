# Test Management Application

## Overview

A test management system (시험업무 관리 시스템) for tracking projects and their associated test items. The application allows users to create projects, add test items to projects, track test completion status, manage reports, and upload photos. Built as a full-stack TypeScript application with a React frontend and Express backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme configuration
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite

**Design System**: Material Design variant optimized for data-heavy applications with:
- Inter font family via Google Fonts
- Dark office theme with HSL-based CSS variables
- Information hierarchy prioritized over visual flair
- Fixed sidebar (16rem) with flex content area layout

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Style**: RESTful JSON API under `/api` prefix
- **File Uploads**: Multer with disk storage in `uploads/` directory

**Key API Endpoints**:
- `/api/projects` - CRUD operations for projects
- `/api/projects/:id/test-items` - Test items scoped to projects
- `/api/test-items` - All test items
- `/uploads/*` - Static file serving for uploaded images

### Data Storage
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts`
- **Current Storage**: In-memory storage class (`MemStorage`) implementing `IStorage` interface
- **Database Ready**: Drizzle configuration exists for PostgreSQL migration when DATABASE_URL is provided

**Data Models**:
- `User`: Basic authentication (id, username, password)
- `Project`: Name, description, specs, dates, status, images
- `TestItem`: Linked to project, tracks test/report completion, photos, dates

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Drizzle table definitions and Zod validation schemas
- Path alias: `@shared/*` maps to `./shared/*`

### Build System
- **Development**: Vite dev server with HMR, Express API proxy
- **Production**: Custom build script using esbuild for server, Vite for client
- **Output**: `dist/` directory with `index.cjs` server and `public/` static assets

## External Dependencies

### Database
- **PostgreSQL**: Required when DATABASE_URL environment variable is set
- **Drizzle Kit**: Database schema push via `npm run db:push`

### UI Libraries
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, tabs, etc.)
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel component
- **date-fns**: Date formatting utilities

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, dev banner (development only)
- **TypeScript**: Strict mode with bundler module resolution

### Session Management
- **connect-pg-simple**: PostgreSQL session store (available but not currently active)
- **express-session**: Session middleware support