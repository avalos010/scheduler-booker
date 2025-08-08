# 🗓️ Scheduler Booker

A modern, full-stack scheduling application built with Next.js 15, Supabase, and TypeScript. Perfect for businesses and individuals who need to manage appointments and availability.

## ✨ Features

### 🔐 Authentication

- **Secure Login/Signup** with Supabase Auth
- **Email verification** for new accounts
- **Password validation** and error handling

### 🎯 Onboarding Flow

- **Multi-step setup** for new users
- **Business vs Individual** user types
- **Availability configuration** with timezone support
- **Work schedule setup** with customizable hours

### 🧪 Testing

- **Comprehensive test suite** with 10 passing tests
- **React Testing Library** for component testing
- **Jest** for test runner
- **Mock Supabase** for isolated testing

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Forms**: React Hook Form + Zod validation
- **Testing**: Jest + React Testing Library
- **Development**: Turbopack for fast builds

## 📦 Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/scheduler-booker.git
   cd scheduler-booker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

### Run all tests

```bash
npm test
```

### Run tests in watch mode

```bash
npm run test:watch
```

### Run tests with coverage

```bash
npm run test:coverage
```

### Run specific test files

```bash
# Authentication tests
npm test -- --testPathPatterns=LoginForm.simple.test.tsx
npm test -- --testPathPatterns=SignupForm.simple.test.tsx

# Onboarding tests
npm test -- --testPathPatterns=OnboardingForm.simple.test.tsx
```

## 📁 Project Structure

```
scheduler-booker/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── login/             # Login page
│   │   ├── signup/            # Signup page
│   │   ├── onboarding/        # Onboarding flow
│   │   └── dashboard/         # Dashboard page
│   ├── components/
│   │   ├── auth/              # Authentication components
│   │   │   ├── LoginForm.tsx
│   │   │   └── SignupForm.tsx
│   │   └── onboarding/        # Onboarding components
│   │       └── OnboardingForm.tsx
│   └── lib/
│       ├── supabase.ts        # Supabase client
│       ├── test-utils.tsx     # Testing utilities
│       └── test-config.ts     # Test configuration
├── jest.config.js             # Jest configuration
├── jest.setup.js              # Test setup and mocks
└── package.json
```

## 🎯 Key Features

### Authentication System

- **Login Form**: Email/password authentication
- **Signup Form**: Registration with password confirmation
- **Error Handling**: Comprehensive error messages
- **Loading States**: User feedback during operations

### Onboarding Flow

- **Step 1**: User type selection (Business/Individual)
- **Step 2**: Availability configuration
- **Form Validation**: Real-time validation with Zod
- **Multi-step Navigation**: Back/forward navigation

### Testing Coverage

- **10 passing tests** across all components
- **User interaction testing** with React Testing Library
- **Mock Supabase** for isolated testing
- **Form validation testing**

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### Environment Variables

| Variable                        | Description                 | Required |
| ------------------------------- | --------------------------- | -------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Your Supabase project URL   | Yes      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes      |

## 🧪 Test Results

```
Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Snapshots:   0 total
Time:        1.128 s
```

### Test Coverage

- ✅ **LoginForm**: 3/3 tests passing
- ✅ **SignupForm**: 3/3 tests passing
- ✅ **OnboardingForm**: 4/4 tests passing

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

- **Netlify**: Compatible with Next.js
- **Railway**: Easy deployment with database
- **Supabase**: Host database and deploy app

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Next.js** for the amazing React framework
- **Supabase** for the backend-as-a-service
- **Tailwind CSS** for the utility-first CSS framework
- **React Testing Library** for the testing utilities

---

**Built with ❤️ using Next.js 15 and Supabase**
