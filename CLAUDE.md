# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UIGen is an AI-powered React component generator with live preview. It uses Claude AI to generate React components based on natural language descriptions and provides an in-browser preview using a virtual file system.

## Key Commands

### Development

```bash
npm run dev              # Start dev server with Turbopack
npm run dev:daemon       # Start dev server in background, logs to logs.txt
```

### Testing

```bash
npm test                 # Run all tests with Vitest
```

### Build

```bash
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
```

### Database

```bash
npm run setup            # Install deps, generate Prisma client, run migrations
npm run db:reset         # Reset database (use with caution)
```

## Architecture

### Virtual File System (`src/lib/file-system.ts`)

- Core class: `VirtualFileSystem` - in-memory file system that doesn't write to disk
- All files stored in `Map<string, FileNode>` with path normalization
- Key methods: `createFile()`, `updateFile()`, `deleteFile()`, `rename()`, `viewFile()`, `replaceInFile()`
- Serialization: `serialize()` and `deserializeFromNodes()` for persistence

### AI Tool Integration (`src/lib/tools/`)

The AI uses two primary tools to manipulate the file system:

- **str_replace_editor** (`str-replace.ts`): Create files, view files, replace strings, insert text
- **file_manager** (`file-manager.ts`): Rename/move and delete files/directories

Both tools operate on the same `VirtualFileSystem` instance passed to them.

### JSX Transformation (`src/lib/transform/jsx-transformer.ts`)

- `transformJSX()`: Uses Babel standalone to transpile JSX/TSX to JavaScript
- `createImportMap()`: Generates ES module import maps with blob URLs for in-browser execution
- Handles third-party packages via esm.sh CDN
- Supports `@/` alias for local imports (maps to root `/`)
- `createPreviewHTML()`: Generates complete HTML with import map, Tailwind CDN, and error boundary

### Context Architecture

- **FileSystemContext** (`src/lib/contexts/file-system-context.tsx`): Manages virtual file system state, selected file, handles tool calls from AI
- **ChatContext** (`src/lib/contexts/chat-context.tsx`): Wraps Vercel AI SDK's `useChat`, passes file system state to API, handles tool call updates

### API Route (`src/app/api/chat/route.ts`)

- POST handler using Vercel AI SDK's `streamText()`
- Receives messages and serialized file system state
- Reconstructs `VirtualFileSystem` on server
- Provides AI with tools for file manipulation
- `onFinish`: Saves conversation and file system state to database for authenticated users
- Uses prompt caching for system prompt (Anthropic's ephemeral cache)

### Data Model (Prisma)

```prisma
User {
  id, email, password (bcrypt hashed)
  projects[]
}

Project {
  id, name, userId
  messages: String    # JSON serialized Message[]
  data: String        # JSON serialized file system nodes
}
```

### AI Prompt System (`src/lib/prompts/generation.tsx`)

- System prompt instructs AI to create React components with Tailwind CSS
- Enforces `/App.jsx` as root component with default export
- All local imports must use `@/` alias (e.g., `@/components/Calculator`)
- No HTML files allowed - App.jsx is the entry point

### Preview Architecture

The preview works entirely in-browser:

1. Transform all `.jsx`/`.tsx` files to JS using Babel
2. Create blob URLs for transformed code
3. Generate import map mapping file paths and `@/` aliases to blob URLs
4. Third-party packages resolve to esm.sh
5. Inject import map + entry point into iframe HTML
6. Include Tailwind CDN for styling
7. Error boundary catches runtime errors

## File Organization

```
src/
  app/                  # Next.js app router pages
    api/chat/          # AI chat endpoint
    [projectId]/       # Project-specific page
  components/          # React components
    auth/              # Auth forms and dialogs
    chat/              # Chat interface components
    editor/            # Code editor and file tree
    preview/           # Preview frame
    ui/                # shadcn/ui components
  lib/
    contexts/          # React contexts
    tools/             # AI tools (file manager, str replace)
    transform/         # JSX transformation and preview generation
    auth.ts            # JWT-based session management
    file-system.ts     # Virtual file system implementation
    prisma.ts          # Prisma client singleton
    provider.ts        # AI model provider setup
  actions/             # Server actions for projects
prisma/
  schema.prisma        # Database schema
```

## Important Patterns

### @/ Import Alias

The `@/` prefix is used throughout the codebase and maps to the `src/` directory for the Next.js app, but in the AI-generated components, it maps to the virtual file system root `/`.

### Testing

- Uses Vitest with jsdom environment
- React Testing Library for component tests
- Test files: `__tests__/*.test.tsx` alongside source files

### Authentication

- JWT-based sessions stored in httpOnly cookies (using jose library)
- Passwords hashed with bcrypt
- Anonymous users can work without accounts; prompted to sign up to save
- Anonymous work tracked in localStorage

### Mock Provider

If `ANTHROPIC_API_KEY` is not set, the app uses a mock provider that returns static code instead of calling Claude AI.

- Use comments sparingly. Only comment complex code.
- The database schema is defines in the @prisma/schema.prisma files. Reference it anytime you need to understand the structure of data stored in the database.
