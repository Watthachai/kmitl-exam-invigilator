# Contributing Guide

## Table of Contents
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Project Structure](#project-structure)

## Getting Started

### Prerequisites
- Node.js >= 18.0.0 
- npm >= 9.0.0
- Git
- PostgreSQL database

### Initial Setup
1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/kmitl-exam-invigilator.git`
3. Install dependencies: `npm install`
4. Copy environment file: `cp .env.example .env.local`
5. Configure environment variables
6. Run development server: `npm run dev`

## Development Workflow

### Branching Strategy
- `main` - Production releases
- `develop` - Development branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Development Process
1. Create new branch from `develop`
2. Write code and tests
3. Run tests: `npm run test` 
4. Commit changes following [Conventional Commits](https://www.conventionalcommits.org/)
5. Push branch and create PR against `develop`

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Use async/await over Promises
- Document complex functions with JSDoc

### React/Next.js
- Use functional components
- Implement proper error boundaries
- Follow React hooks best practices
- Keep components small and focused

### CSS/Tailwind
- Follow BEM naming convention for custom CSS
- Prefer Tailwind utility classes
- Keep styles modular and reusable

## Pull Request Process
1. Update documentation
2. Add tests for new functionality
3. Get at least one code review approval
4. Squash commits before merging
5. Delete branch after merging

## Issue Guidelines

### Bug Reports
- Clear steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots/videos if applicable

### Feature Requests
- Problem statement
- Proposed solution
- Acceptance criteria
- Optional: mockups/wireframes

## Project Structure
```
src/
├── app/              # Next.js app router
├── components/       # Reusable UI components
├── lib/             # Shared utilities
├── hooks/           # Custom React hooks
├── types/           # TypeScript types/interfaces
├── api/             # API route handlers
└── styles/          # Global styles
```

### Key Directories
- `app/`: Page components and routing
- `components/`: Shared React components
- `lib/`: Helper functions and utilities
- `api/`: Next.js API route handlers
- `hooks/`: Custom React hooks
- `types/`: TypeScript type definitions

## Testing
- Write unit tests for utilities
- Write integration tests for components
- Write E2E tests for critical paths
- Maintain good test coverage

## Documentation
- Update README.md for major changes
- Document new features in `/docs`
- Include JSDoc for complex functions
- Keep API documentation current

## Support
- Join our Discord community
- Check existing issues first
- Use issue templates
- Be respectful and constructive
