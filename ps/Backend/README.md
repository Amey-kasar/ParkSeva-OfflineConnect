# ParkEase - Parking Management System

## Project Structure

```
Backend/
├── config/                 # Database and app configuration
│   └── db.js              # MongoDB connection
├── controllers/           # Business logic controllers
│   ├── user.controller.js
│   ├── vehicle.controller.js
│   ├── parking*.controller.js
│   ├── payment.controller.js
│   └── receipt.controller.js
├── middleware/            # Express middleware
│   └── auth.js           # Authentication middleware
├── models/               # MongoDB schemas
│   ├── user.model.js
│   ├── vehicle.model.js
│   ├── parking*.model.js
│   ├── payment.model.js
│   └── receipt.model.js
├── routes/               # API route definitions
│   └── entry-routes/
├── services/             # Business services
│   └── pdfService.js    # PDF generation service
├── frontend/            # Angular frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Reusable UI components
│   │   │   ├── pages/         # Page components
│   │   │   ├── services/      # Angular services
│   │   │   └── guards/        # Route guards
│   │   └── styles.css
│   └── package.json
├── .env                 # Environment variables
├── package.json         # Node.js dependencies
└── server.js           # Express server entry point
```

## Backend Structure

### Controllers
- Handle HTTP requests and responses
- Contain business logic
- Interact with models and services

### Models
- Define MongoDB schemas
- Handle data validation
- Provide database operations

### Routes
- Define API endpoints
- Apply middleware
- Route requests to controllers

### Services
- Reusable business logic
- External integrations
- Utility functions

### Middleware
- Authentication and authorization
- Request validation
- Error handling

## Frontend Structure

### Components
- Reusable UI components
- Modal dialogs
- Form components

### Pages
- Route-specific components
- Main application views
- Feature modules

### Services
- HTTP client services
- State management
- Utility services

### Guards
- Route protection
- Authentication checks
- Authorization logic