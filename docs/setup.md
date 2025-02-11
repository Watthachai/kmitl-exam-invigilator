# KMITL Exam Invigilator System - Setup Guide

## Prerequisites

### Required Software
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)
- PostgreSQL (v14.0 or higher)
- Git

### Development Tools
- Visual Studio Code (recommended)
- Postman (for API testing)
- pgAdmin 4 (for database management)

## Installation Steps

### 1. System Setup
```bash
# Clone the repository
git clone https://github.com/your-username/kmitl-exam-invigilator.git
cd kmitl-exam-invigilator

# Install dependencies 
npm install

# Generate Prisma client
npx prisma generate
```

### 2. Environment Configuration
```bash
# Copy example env file
cp .env.example .env.local

# Required environment variables:
DATABASE_URL="postgresql://username:password@localhost:5432/kmitl_exam_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 3. Database Setup
```bash
# Create database
createdb kmitl_exam_db

# Run migrations
npx prisma migrate dev

# Seed initial data
npx prisma db seed
```

### 4. Google OAuth Configuration
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Google OAuth API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized redirect URIs:
    - `http://localhost:3000/api/auth/callback/google` (development)
    - `https://your-domain.com/api/auth/callback/google` (production)

### 5. Development Server
```bash
# Start development server
npm run dev

# In another terminal, start Prisma Studio (optional)
npx prisma studio
```

## Project Structure

```
kmitl-exam-invigilator/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   ├── components/     # Shared components
│   │   ├── dashboard/      # Dashboard pages
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configs
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # Database migrations
│   └── seed.ts            # Seed data script
├── public/                 # Static files
└── docs/                  # Documentation
```

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful commit messages

### Testing
```bash
# Run unit tests
npm run test

# Run e2e tests
npm run test:e2e

# Run linting
npm run lint
```

### Database Management
```bash
# Create new migration
npx prisma migrate dev --name migration_name

# Reset database
npx prisma migrate reset

# Generate Prisma client after schema changes
npx prisma generate
```

## Deployment

### Production Build
```bash
# Build application
npm run build

# Start production server
npm start
```

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy using Vercel dashboard

### Database Production Setup
1. Create production database
2. Update DATABASE_URL in production environment
3. Run migrations on production database
4. Configure backup schedule

## Troubleshooting

### Common Issues
1. Database connection errors
    - Check DATABASE_URL format
    - Verify PostgreSQL is running
    - Check network access

2. Authentication issues
    - Verify Google OAuth credentials
    - Check NEXTAUTH configuration
    - Validate redirect URIs

3. Build errors
    - Clear .next directory
    - Remove node_modules and reinstall
    - Check TypeScript errors

### Support
- GitHub Issues for bug reports
- Documentation for reference
- Community Discord for discussions

## Security Considerations
- Keep environment variables secure
- Regular dependency updates
- Enable rate limiting
- Implement CSRF protection
- Use secure session configuration

## Performance Optimization
- Enable image optimization
- Configure caching strategies
- Implement lazy loading
- Use production builds
- Monitor database queries

## Maintenance
- Regular backups
- Log rotation
- Performance monitoring
- Security updates
- Database optimization
