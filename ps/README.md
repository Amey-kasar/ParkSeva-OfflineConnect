# ParkEase Frontend

## Project Structure

```
src/
├── app/
│   ├── components/           # Reusable UI components
│   │   ├── payment-modal/
│   │   └── toast/
│   ├── core/                # Core functionality
│   │   ├── guards/          # Route guards
│   │   └── interceptors/    # HTTP interceptors
│   ├── pages/               # Page components
│   │   ├── dashboard/
│   │   ├── home/
│   │   ├── login/
│   │   ├── parking/
│   │   └── register/
│   ├── services/            # Angular services
│   │   ├── api.service.ts
│   │   └── toast.service.ts
│   ├── shared/              # Shared utilities
│   │   ├── components/      # Shared components
│   │   ├── interfaces/      # TypeScript interfaces
│   │   └── utils/          # Utility functions
│   ├── app.component.*      # Root component
│   ├── app.config.ts        # App configuration
│   └── app.routes.ts        # Route definitions
├── environments/            # Environment configs
│   ├── environment.ts       # Development
│   └── environment.prod.ts  # Production
├── styles.css              # Global styles
└── main.ts                 # Application bootstrap
```

## Features

- **Responsive Design**: Mobile-first approach
- **Modern UI**: Glassmorphism and gradient effects
- **Type Safety**: TypeScript interfaces
- **Route Protection**: Auth guards
- **HTTP Interceptors**: Automatic token handling
- **Toast Notifications**: User feedback system
- **PDF Generation**: Receipt downloads
- **Real-time Updates**: Live data refresh

## Development

```bash
npm install
npm start
```

## Build

```bash
npm run build
```