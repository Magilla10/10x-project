# AI Flashcard Generator

An MVP web application for automatically generating high-quality educational flashcards using AI, designed to streamline the learning process and promote the effective use of spaced repetition.

## Tech Stack

- **Frontend**: Astro 5, React 19, TypeScript 5, Tailwind CSS 4, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Authentication, BaaS)
- **AI Services**: OpenRouter.ai
- **Testing**: Vitest, Playwright, React Testing Library
- **CI/CD**: GitHub Actions

## Getting Started

### Prerequisites

- Node.js version `22.14.0` (recommended to use `nvm`)
- Supabase and OpenRouter.ai API keys

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ai-flashcard-generator.git
   cd ai-flashcard-generator
   ```

2. **Set up environment variables:**
   Create a `.env` file with:
   ```env
   PUBLIC_SUPABASE_URL="your-supabase-url"
   PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   OPENROUTER_API_KEY="your-openrouter-api-key"
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:4321`.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Lint code

## Project Scope

### In Scope (MVP Features)

- **AI-Powered Flashcard Generation**: Automatically create flashcards from user-provided text
- **Manual Flashcard Management**: Create, view, edit, and delete flashcards manually
- **User Authentication**: Secure user registration and login to ensure data isolation
- **Spaced Repetition System**: A basic algorithm to help schedule study sessions
- **Account Deletion**: Ability for users to permanently delete their account and all associated data

## Contributing

Contributions are welcome! Please submit pull requests for bug fixes, features, or improvements.

## License
...
