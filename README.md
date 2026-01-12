 HEAD
# U_Sport_Arena

# U Sport Arena - Football Field Booking Web App

A modern Next.js application for booking football fields, built with TypeScript, Tailwind CSS, and Shadcn UI.

## Features

- 🏟️ Browse available football fields
- 📋 View detailed field information
- 🔐 Authentication ready (Supabase integration)
- 🎨 Modern, clean UI with White and Red theme
- 🎫 **Promotion System**: Coupon codes and discounts for bookings

## Quick Start

### 🚀 Promotion System Setup
See [QUICK_START.md](QUICK_START.md) for complete setup instructions including database migration.

### Basic Setup
```bash
npm install
npm run dev
```

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **Database**: Supabase (with SSR support)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your Supabase credentials:
     - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── fields/
│   │   └── [id]/
│   │       ├── page.tsx          # Field detail page
│   │       └── not-found.tsx     # 404 page for fields
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/
│   │   └── button.tsx            # Button component
│   └── Navbar.tsx                # Navigation bar
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client
│   │   └── middleware.ts         # Supabase middleware
│   ├── mockData.ts               # Mock football fields data
│   └── utils.ts                  # Utility functions
└── middleware.ts                 # Next.js middleware
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## MVP Features

✅ Navbar with Logo and Login button
✅ Landing page with list of Football Fields (mock data)
✅ Field Detail page with "Book Now" button
✅ Supabase client setup (ready for database integration)

## Next Steps

- Connect to Supabase database
- Implement authentication
- Add booking functionality
- Add user dashboard
- Add payment integration

 a5d110e (Initial commit)
