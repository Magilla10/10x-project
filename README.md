# AI Flashcard Generator

An MVP web application for automatically generating high-quality educational flashcards using AI, designed to streamline the learning process and promote the effective use of spaced repetition.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Project Structure](#project-structure)
- [Project Scope](#project-scope)
- [AI Development Support](#ai-development-support)
- [Project Status](#project-status)
- [Contributing](#contributing)
- [License](#license)

## Project Description

The AI Flashcard Generator addresses the time-consuming nature of manually creating study materials. By leveraging AI, users can quickly generate flashcards from source text, manage them, and utilize a simple spaced repetition system to enhance their learning efficiency. The platform provides user authentication to ensure data privacy and a clean, intuitive interface for a seamless experience.

## Tech Stack

| Category          | Technology                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------- |
| **Frontend**      | [Astro 5](https://astro.build/), [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/), [Tailwind CSS 4](https://tailwindcss.com/), [Shadcn/ui](https://ui.shadcn.com/) |
| **Backend**       | [Supabase](https://supabase.io/) (PostgreSQL, Authentication, BaaS)                                         |
| **AI Services**   | [OpenRouter.ai](https://openrouter.ai/)                                                                     |
| **CI/CD & Hosting** | [GitHub Actions](https://github.com/features/actions), [DigitalOcean](https://www.digitalocean.com/) (Docker) |

## Getting Started Locally

To set up and run the project on your local machine, follow these steps.

### Prerequisites

- Node.js version `22.14.0` (it is recommended to use `nvm` to manage Node.js versions).
- Access keys for Supabase and OpenRouter.ai.

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/ai-flashcard-generator.git
    cd ai-flashcard-generator
    ```

2.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add your Supabase and OpenRouter API keys.
    ```env
    PUBLIC_SUPABASE_URL="your-supabase-url"
    PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
    OPENROUTER_API_KEY="your-openrouter-api-key"
    ```

3.  **Switch to the correct Node.js version:**
    If you are using `nvm`, run the following command:
    ```bash
    nvm use
    ```

4.  **Install dependencies:**
    ```bash
    npm install
    ```

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:4321`.

## Available Scripts

The following scripts are available in the `package.json`:

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Lints the codebase for errors.
- `npm run lint:fix`: Lints the codebase and automatically fixes issues.
- `npm run format`: Formats the code using Prettier.

## Project Structure

When introducing changes to the project, always follow the directory structure below:

```md
.
├── src/
│   ├── layouts/    # Astro layouts
│   ├── pages/      # Astro pages
│   │   └── api/    # API endpoints
│   ├── components/ # UI components (Astro & React)
│   └── assets/     # Static assets
├── public/         # Public assets
```

## Project Scope

### In Scope (MVP Features)

- **AI-Powered Flashcard Generation**: Automatically create flashcards from user-provided text.
- **Manual Flashcard Management**: Create, view, edit, and delete flashcards manually.
- **User Authentication**: Secure user registration and login to ensure data isolation.
- **Spaced Repetition System**: A basic algorithm to help schedule study sessions.
- **Account Deletion**: Ability for users to permanently delete their account and all associated data.

### Out of Scope

- Advanced spaced repetition algorithms (e.g., SM-2).
- Importing from file formats like PDF or DOCX.
- Sharing flashcard decks between users.
- Mobile applications (the MVP is web-only).
- Advanced organizational features like tags or categories.

## AI Development Support

This project is configured with AI development tools to enhance the development experience, providing guidelines for:

- Project structure
- Coding practices
- Frontend development
- Styling with Tailwind
- Accessibility best practices
- Astro and React guidelines

### Cursor IDE

The project includes AI rules in `.cursor/rules/` directory that help Cursor IDE understand the project structure and provide better code suggestions.

### GitHub Copilot

AI instructions for GitHub Copilot are available in `.github/copilot-instructions.md`.

### Windsurf

The `.windsurfrules` file contains AI configuration for Windsurf.

## Project Status

This project is currently in the **MVP development phase**.

## Contributing

Please follow the AI guidelines and coding practices defined in the AI configuration files when contributing to this project. Contributions are welcome—feel free to submit pull requests for bug fixes, features, or improvements.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
