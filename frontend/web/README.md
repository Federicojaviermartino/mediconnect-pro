# MediConnect Pro - Web Frontend

Modern web application built with Next.js 14, React, TypeScript, and Tailwind CSS for the MediConnect Pro telemedicine platform.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Query** - Data fetching and caching
- **Zustand** - State management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Radix UI** - Accessible UI components
- **Recharts** - Data visualization
- **Socket.IO Client** - WebSocket communication
- **Simple Peer** - WebRTC video calls

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Running backend services (API Gateway, Auth, Patient, Vitals, Consultation, ML)

### Installation

```bash
cd frontend/web
npm install
```

### Configuration

```bash
cp .env.example .env.local
# Edit .env.local with your API URLs
```

### Development

```bash
npm run dev
# Open http://localhost:3000
```

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js 14 App Router
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   ├── patients/          # Patient management
│   ├── vitals/            # Vitals monitoring
│   └── consultations/     # Video consultations
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Layout components
│   ├── patients/         # Patient components
│   ├── vitals/           # Vitals components
│   └── consultations/    # Consultation components
├── lib/                  # Utilities
│   └── utils.ts          # Helper functions
├── services/             # API services
│   └── api.ts            # API client & endpoints
├── hooks/                # Custom React hooks
├── store/                # Zustand stores
├── types/                # TypeScript types
│   └── index.ts          # Shared types
└── styles/               # Additional styles
```

## Features

### 1. Authentication
- Login/Register forms
- JWT token management
- Role-based access control (Admin, Doctor, Nurse, Patient)
- Protected routes

### 2. Dashboard
- Overview statistics
- Recent patients
- Upcoming consultations
- Vital signs alerts
- Quick actions

### 3. Patient Management
- Patient list with search/filters
- Patient profile view
- Medical history
- Appointments
- Prescriptions
- Document upload

### 4. Real-time Vitals Monitoring
- Live vital signs display
- Trend charts (Recharts)
- Anomaly alerts
- Historical data
- WebSocket connection for real-time updates

### 5. Video Consultations
- WebRTC video/audio calls
- Screen sharing
- In-call chat
- Call controls (mute, video on/off)
- Consultation notes
- Prescription during call

### 6. ML Risk Predictions
- Comprehensive risk assessment
- Heart disease prediction
- Diabetes risk
- Stroke risk
- Risk factor visualization
- Personalized recommendations

## Key Components

### Layout Components

**DashboardLayout** (`components/layout/dashboard-layout.tsx`)
- Sidebar navigation
- Top bar with user menu
- Responsive design

**Sidebar** (`components/layout/sidebar.tsx`)
- Navigation links
- Role-based menu items
- Active route highlighting

### UI Components

**Button** (`components/ui/button.tsx`)
- Multiple variants: default, destructive, outline, ghost
- Size options: sm, md, lg
- Loading state

**Card** (`components/ui/card.tsx`)
- Container with header, content, footer
- Shadow and border styles

**Dialog** (`components/ui/dialog.tsx`)
- Modal dialogs using Radix UI
- Accessible and keyboard navigation

**Toaster** (`components/ui/toaster.tsx`)
- Toast notifications
- Success, error, warning states

### API Integration

**API Client** (`services/api.ts`)
```typescript
import { patientApi } from '@/services/api'

// List patients
const { data } = await patientApi.list({ page: 1, limit: 20 })

// Get patient details
const patient = await patientApi.get(patientId)
```

**React Query Usage**
```typescript
import { useQuery } from '@tanstack/react-query'
import { patientApi } from '@/services/api'

function PatientList() {
  const { data, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patientApi.list(),
  })

  if (isLoading) return <div>Loading...</div>
  return <div>{/* Render patients */}</div>
}
```

### WebSocket Connection

**Vitals Real-time** (`hooks/useVitalsSocket.ts`)
```typescript
import { useEffect } from 'react'
import io from 'socket.io-client'

export function useVitalsSocket(patientId: string) {
  useEffect(() => {
    const socket = io('http://localhost:3003/vitals')

    socket.emit('subscribe:patient', patientId)

    socket.on('vital:new', (data) => {
      console.log('New vital sign:', data)
      // Update UI
    })

    return () => {
      socket.disconnect()
    }
  }, [patientId])
}
```

### WebRTC Video Call

**Video Consultation** (`components/consultations/video-room.tsx`)
```typescript
import SimplePeer from 'simple-peer'
import io from 'socket.io-client'

export function VideoRoom({ roomId }: { roomId: string }) {
  // Initialize peer connection
  // Handle WebRTC signaling
  // Display local and remote video streams
  // Controls: mute, video toggle, screen share
}
```

## Environment Variables

```env
# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000

# Service URLs (internal)
AUTH_SERVICE_URL=http://localhost:3001
PATIENT_SERVICE_URL=http://localhost:3002
VITALS_SERVICE_URL=http://localhost:3003
CONSULTATION_SERVICE_URL=http://localhost:3004
ML_SERVICE_URL=http://localhost:8000

# Features
NEXT_PUBLIC_ENABLE_ML_FEATURES=true
NEXT_PUBLIC_ENABLE_VIDEO_CONSULTATIONS=true
```

## Styling

### Tailwind CSS

Custom color palette defined in `tailwind.config.ts`:
- Primary: Blue (#3b82f6)
- Secondary: Gray
- Success: Green
- Warning: Yellow
- Destructive: Red

### CSS Variables

Defined in `app/globals.css`:
```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96.1%;
  --success: 142.1 76.2% 36.3%;
  /* ... */
}
```

### Dark Mode Support

Toggle with `dark` class on `<html>` element.

## State Management

### Zustand Stores

**Auth Store** (`store/auth.ts`)
```typescript
import { create } from 'zustand'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: async (email, password) => {
    // Login logic
  },
  logout: () => {
    // Logout logic
  },
}))
```

## Routing

### App Router Structure

```
app/
├── page.tsx                    # Home page (/)
├── auth/
│   ├── login/page.tsx         # Login (/auth/login)
│   └── register/page.tsx      # Register (/auth/register)
├── dashboard/
│   └── page.tsx               # Dashboard (/dashboard)
├── patients/
│   ├── page.tsx               # Patient list (/patients)
│   └── [id]/page.tsx          # Patient detail (/patients/:id)
├── vitals/
│   └── [patientId]/page.tsx   # Vitals (/vitals/:patientId)
└── consultations/
    ├── page.tsx               # Consultations list
    └── [id]/page.tsx          # Consultation room
```

### Protected Routes

Use middleware or layout-level authentication checks:
```typescript
// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    redirect('/auth/login')
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
```

## Performance Optimization

### Code Splitting

Next.js automatically code-splits by route. For dynamic imports:
```typescript
import dynamic from 'next/dynamic'

const VideoRoom = dynamic(() => import('@/components/consultations/video-room'), {
  ssr: false,
  loading: () => <div>Loading...</div>,
})
```

### Image Optimization

Use Next.js Image component:
```typescript
import Image from 'next/image'

<Image
  src="/avatar.jpg"
  alt="User avatar"
  width={40}
  height={40}
  className="rounded-full"
/>
```

### React Query Caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})
```

## Testing

```bash
# Run tests (when configured)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

### Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Environment Variables in Production

Set environment variables in your hosting platform:
- Vercel: Project Settings > Environment Variables
- Docker: docker-compose.yml or Kubernetes ConfigMap

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Accessibility

- ARIA labels
- Keyboard navigation
- Screen reader support
- Focus management
- Color contrast (WCAG AA)

## License

Proprietary - MediConnect Pro

## Support

For issues and questions, contact the frontend team.
