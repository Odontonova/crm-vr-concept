# AI Development Rules

This document outlines the technical stack and development guidelines for this project. Following these rules ensures consistency, maintainability, and leverages the existing architecture effectively.

## Tech Stack

The application is built with a modern, component-based architecture. The key technologies are:

- **Framework**: React with Vite for a fast development experience.
- **Language**: TypeScript for type safety and improved developer experience.
- **UI Components**: A combination of `shadcn/ui` and Radix UI provides a comprehensive, accessible, and customizable component library.
- **Styling**: Tailwind CSS is used exclusively for styling via utility classes.
- **Backend & Database**: Supabase handles authentication, database interactions, and other backend services.
- **Data Fetching**: TanStack Query (`react-query`) manages all server state, including data fetching, caching, and mutations.
- **Routing**: React Router (`react-router-dom`) is used for all client-side navigation.
- **Forms**: React Hook Form and Zod are used for building and validating forms.
- **Charts**: Recharts is used for data visualization and dashboards.
- **Icons**: Lucide React provides a clean and consistent set of icons.

## Library Usage Guidelines

To maintain consistency, please adhere to the following rules when adding or modifying features:

- **UI Components**: **ALWAYS** use components from `shadcn/ui` (located in `@/components/ui`). Do not build common components like buttons, inputs, or cards from scratch.
- **Styling**: **ONLY** use Tailwind CSS utility classes for styling. Do not write custom CSS files or use inline `style` attributes.
- **Icons**: **ALWAYS** use icons from the `lucide-react` library.
- **Data Fetching**: **ALL** interaction with the Supabase backend (queries, mutations) **MUST** be handled through TanStack Query. Encapsulate this logic within custom hooks in the `src/hooks` directory (e.g., `useLeads.ts`).
- **Routing**: **ALL** routes must be defined in `src/App.tsx` using `react-router-dom`.
- **Forms**: **ALWAYS** use `react-hook-form` for form state management and `zod` for schema-based validation.
- **Notifications**: **ALWAYS** use `sonner` for toast notifications to provide user feedback. Import it via `import { toast } from 'sonner';`.
- **Charts**: **ONLY** use `recharts` for creating charts and data visualizations.
- **Drag and Drop**: For any drag-and-drop functionality, use the `@dnd-kit` library, as seen in the Pipeline page.
- **State Management**: For client-side state, use React's built-in hooks like `useState` and `useContext`. Avoid introducing other state management libraries.