---
name: poliland-project-architecture
description: Project-specific architecture, coding conventions, UI consistency, and development guidelines for the PoliLand Kairagi mobile application. Use whenever analyzing, modifying, debugging, or adding features in the PoliLand Kairagi repository.
---

# PoliLand Kairagi — Project Architecture Skill

## 1. Project Identity

This skill applies exclusively to the PoliLand Kairagi repository.

PoliLand Kairagi is a mobile-oriented application for managing property lot information, marketing activities, prospective clients, and administrative operations.

The application supports three primary user roles:

1. Admin / Kepala Bagian
2. Marketing
3. Client

### Main Product Goals

- Provide an interactive property siteplan.
- Display detailed information for each property lot.
- Allow users to search and filter available lots.
- Display 360-degree panorama images for individual lots.
- Support property marketing and prospective client management.
- Provide role-specific interfaces and functionality.
- Maintain consistent UI/UX across all user roles.

Always understand the business purpose of a feature before implementing it.

---

## 2. Technology Stack

The project uses the following technologies. Verify `package.json` and the existing implementation before introducing or changing dependencies.

### Frontend

- Vue 3
- Composition API
- TypeScript
- Vite
- Ionic Vue
- Ionic Vue Router
- HTML5
- CSS

### Backend and Data

- Supabase
- PostgreSQL
- Supabase Authentication
- Supabase Storage
- Supabase REST API

### Mobile

- Ionic Framework
- Capacitor
- Mobile-first interface

### Development Environment

- Visual Studio Code
- Node.js
- npm
- Git

Do not introduce another framework, state management library, UI library, or backend service without a clear technical reason and approval.

---

## 3. Architecture Principles

Follow the existing architecture instead of imposing a completely different architecture.

### 3.1 Vue Component Architecture

Use Vue 3 Composition API.

Preferred component syntax:

```vue
<script setup lang="ts">
import { computed, ref } from "vue";

const isLoading = ref(false);

const buttonLabel = computed(() => {
  return isLoading.value ? "Memuat..." : "Simpan";
});
</script>

<template>
  <button :disabled="isLoading">
    {{ buttonLabel }}
  </button>
</template>
```

Guidelines:

- Prefer `<script setup lang="ts">`.
- Use TypeScript for props, emits, function parameters, and returned data.
- Use `ref()` for reactive primitive values.
- Use `computed()` for derived values.
- Use `watch()` only when observing reactive changes is necessary.
- Use lifecycle hooks appropriately.
- Use `defineProps()` and `defineEmits()` for component contracts.
- Avoid unnecessary watchers.
- Avoid direct DOM manipulation when Vue provides a suitable mechanism.
- Keep components focused on a clear responsibility.

Do not rewrite existing components just to change their coding style.

### 3.2 Component Responsibilities

Use the existing component organization.

The repository currently contains component groupings such as:

- `Admin`
- `auth`
- `common`
- `home`
- `lots`
- `marketing`
- `navigation`
- `siteplan`
- `ui`

Views are organized by application pages and user roles.

Before creating a new component:

1. Search for an existing component with similar functionality.
2. Determine whether it can be reused.
3. Check whether the feature belongs in a component, view, composable, or service.
4. Reuse existing UI components whenever possible.
5. Avoid creating duplicate components with slightly different names.

### 3.3 Component Separation

Follow these responsibilities:

| Layer       | Responsibility                                        |
| ----------- | ----------------------------------------------------- |
| Views       | Page-level composition and page-specific interactions |
| Components  | Reusable visual elements and UI interactions          |
| Composables | Reusable reactive logic                               |
| Services    | API requests, Supabase operations, and business logic |
| Router      | Navigation, route metadata, and access control        |
| Types       | Shared TypeScript interfaces and types                |

Do not put every feature's logic inside a single Vue component.

Do not move code between layers without understanding its current dependencies.

---

## 4. Routing and Authentication

The application uses Ionic Vue Router.

The existing routing architecture includes:

- Public routes
- Authentication routes
- Admin routes
- Marketing routes
- Client routes
- Fallback routes

Route metadata may include:

- `requiresAuth`
- `role`
- `publicOnly`

Authentication and authorization are handled through the existing authentication services and navigation guards.

### Rules

- Never bypass existing authentication guards.
- Never assume that hiding a UI element is sufficient authorization.
- Validate user roles before allowing access to protected pages.
- Preserve existing role-based redirects.
- Follow the existing authentication flow.
- Avoid duplicating authentication logic inside individual views.
- Never expose Supabase service-role credentials in frontend code.
- Do not change authentication behavior without examining the existing implementation.

The application uses role information associated with the `profiles` table.

Verify the actual database schema and current authentication implementation before modifying role-related logic.

---

## 5. Supabase and Database Guidelines

Supabase is the primary backend and database platform.

Use the existing Supabase client, service modules, and database conventions.

### Database Rules

- Respect existing table names and column names.
- Preserve existing relationships and foreign keys.
- Follow existing constraints.
- Use appropriate TypeScript types for database records.
- Handle nullable fields explicitly.
- Avoid unnecessary database queries.
- Avoid fetching the same data repeatedly when existing caching is appropriate.
- Use pagination for potentially large datasets.
- Handle loading, success, empty, and error states.

### Database Changes

Before modifying database structures:

1. Inspect the current schema.
2. Identify related tables and dependencies.
3. Check existing SQL migrations.
4. Consider the effect on existing application features.
5. Use migration files when the project already follows a migration workflow.
6. Never silently rename or remove existing columns.
7. Never assume that a database change is safe just because the frontend compiles.

### Security

- Never hardcode API secrets.
- Never expose private credentials.
- Respect Supabase Row Level Security (RLS).
- Never disable RLS as a shortcut to fix authorization problems.
- Check policies when implementing data access.
- Validate user permissions on the backend/database side.

---

## 6. Design System and UI/UX Consistency

UI consistency is a major requirement of PoliLand Kairagi.

The application has multiple user roles. Their interfaces should feel like parts of one product rather than separate applications.

### Core Principles

- Maintain consistent colors.
- Maintain consistent typography.
- Maintain consistent spacing.
- Maintain consistent border radius.
- Maintain consistent shadows.
- Maintain consistent icon styles.
- Maintain consistent button behavior.
- Maintain consistent input styles.
- Maintain consistent modal and dialog behavior.
- Maintain consistent loading and empty states.

### Before Creating UI

Always inspect:

1. Existing design tokens.
2. Existing global styles.
3. Existing reusable UI components.
4. Similar pages in other user roles.
5. Existing mobile layout behavior.

Prefer existing design tokens and components over hardcoded values.

Do not introduce arbitrary colors, spacing, typography, or border radii without checking the design system.

### Mobile-First Requirements

The application is primarily designed for mobile devices.

Prioritize:

- Readable text sizes.
- Comfortable touch targets.
- Appropriate spacing.
- Responsive layouts.
- Proper safe-area handling.
- Smooth scrolling.
- Clear navigation.
- Appropriate keyboard behavior.
- No horizontal overflow.
- No content hidden behind fixed navigation elements.

Do not simply shrink a desktop layout to make it fit a mobile screen.

### UI States

Interactive components should consider:

- Default state
- Hover state, where applicable
- Focus state
- Active state
- Disabled state
- Loading state
- Success state
- Error state
- Empty state

Never leave an interactive button without a meaningful action.

---

## 7. Siteplan and Property Lot Features

The interactive siteplan is a core feature of PoliLand Kairagi.

Existing siteplan functionality includes:

- Displaying lot polygons.
- Selecting a lot.
- Hovering over a lot.
- Displaying lot details.
- Searching for lots.
- Filtering lots.
- Displaying lot availability.
- Connecting lot data with Supabase.
- Supporting panorama information.

### Lot Status

The known lot statuses are:

| Status    | Meaning               |
| --------- | --------------------- |
| Available | Lot is available      |
| Booking   | Lot is being reserved |
| Sold      | Lot has been sold     |

Use the existing status-to-color mapping from the project.

Do not independently define new colors or status labels in multiple components.

### Siteplan Modification Rules

Before modifying siteplan functionality:

1. Inspect `SiteplanMap.vue`.
2. Inspect related polygon components.
3. Inspect the siteplan composable.
4. Inspect the siteplan service.
5. Understand the existing selection and hover behavior.
6. Understand how lot data is loaded and cached.
7. Check the effect on search, filtering, and detail panels.

Avoid changing polygon rendering, coordinate mapping, zoom behavior, or selection logic without understanding the complete flow.

Preserve existing siteplan interactions unless the requested feature explicitly requires changing them.

---

## 8. Composables and Shared State

The existing project uses Vue composables for reusable reactive logic.

Known examples include:

- `useSiteplan`
- `useMascotAnimation`
- `usePageLoading`

Before implementing shared reactive logic:

1. Search existing composables.
2. Determine whether the functionality already exists.
3. Reuse existing composables when appropriate.
4. Keep composables focused.
5. Avoid unnecessary global reactive state.
6. Avoid creating multiple competing sources of truth.

The project currently does not use Pinia or Vuex according to the inspected package configuration.

Do not introduce Pinia solely to follow a generic architecture recommendation.

If shared state becomes difficult to maintain, explain the problem and propose a migration plan before implementing a new state management solution.

---

## 9. Code Quality and Maintainability

Write code that is readable, maintainable, and consistent with the repository.

### General Rules

- Use meaningful variable and function names.
- Avoid unnecessary abbreviations.
- Avoid duplicated logic.
- Avoid deeply nested conditions when simpler alternatives exist.
- Avoid oversized components.
- Avoid unnecessary abstractions.
- Remove unused imports and variables.
- Handle errors explicitly.
- Avoid `any` unless there is a justified reason.
- Avoid suppressing TypeScript errors without understanding them.
- Do not leave debugging statements in production code.

### Existing Technical Debt

The previous repository analysis identified potential maintenance concerns:

- `SiteplanMap.vue` is a large component.
- Some marketing views are also large.
- Global window events are used for cross-component communication.
- Shared state is handled without Pinia or Vuex.
- Some filenames have inconsistent naming conventions.

Treat these as areas requiring investigation, not automatic instructions to refactor.

Do not perform large refactoring just because a file is large.

When modifying an existing large component:

1. Understand the relevant section.
2. Identify dependencies.
3. Make the smallest reasonable change.
4. Preserve unrelated behavior.
5. Test the affected functionality.

Do not change the existing architecture without a clear benefit.

---

## 10. Error Handling and User Feedback

All asynchronous operations should handle failures appropriately.

Use the project's existing notification, toast, modal, and error-handling mechanisms.

Every data-driven page should consider:

- Loading state
- Successful data retrieval
- Empty data
- Failed request
- Retry behavior, where appropriate

Do not display raw technical errors directly to end users.

Technical details should be useful for debugging, while user-facing messages should be understandable.

Do not silently swallow errors.

---

## 11. Performance

Prioritize performance on mobile devices.

Pay particular attention to:

- Large siteplan SVGs.
- Polygon rendering.
- Large lists of property lots.
- Repeated Supabase requests.
- Large images and panorama assets.
- Canvas animations.
- Unnecessary component re-renders.
- Memory leaks from event listeners.
- Long-running event handlers.

Use pagination, caching, lazy loading, and cleanup where appropriate.

Do not optimize code without identifying an actual bottleneck or measurable benefit.

---

## 12. Development Workflow

Before modifying any feature, follow this workflow.

### Phase 1 — Understand

1. Read the relevant source files.
2. Inspect related components and services.
3. Identify dependencies.
4. Understand the existing implementation.
5. Identify potential side effects.

Do not assume the existing architecture report is always up to date. Verify current source code.

### Phase 2 — Plan

Before significant changes:

1. Explain the problem.
2. Identify the files that need modification.
3. Describe the proposed solution.
4. Identify potential risks.
5. Avoid unrelated changes.

For simple changes, a short explanation is sufficient.

### Phase 3 — Implement

- Modify only necessary files.
- Follow existing conventions.
- Reuse existing components and services.
- Preserve existing functionality.
- Avoid unnecessary dependency installation.
- Do not replace complete files when a smaller change is sufficient.

### Phase 4 — Verify

After implementation:

1. Run the relevant TypeScript checks.
2. Run the build command.
3. Run relevant tests if available.
4. Check the browser console for errors when applicable.
5. Verify affected navigation and user roles.
6. Check responsive behavior.
7. Report anything that could not be verified.

Use the actual scripts defined in `package.json`. Do not invent commands.

### Phase 5 — Report

At the end, provide:

- Summary of changes.
- Files modified.
- Reason for each significant modification.
- Verification performed.
- Remaining issues or risks.

Never claim a test passed if it was not executed.

---

## 13. Git and Repository Safety

Protect existing work.

Rules:

- Never run `git reset --hard` without explicit permission.
- Never run destructive cleanup commands without explicit permission.
- Never overwrite user changes without inspecting them.
- Never force-push.
- Never commit automatically unless explicitly requested.
- Never push automatically unless explicitly requested.
- Inspect `git status` before significant Git operations.
- Preserve existing uncommitted changes.
- Do not modify unrelated files.

### Local Agent Configuration

The following directories and files may contain local agent configuration:

- `.cline/`
- `.claude/`
- Other local AI-agent configuration directories.

Do not assume they should be committed.

Before Git operations, inspect `.gitignore` and `.git/info/exclude`.

The owner may intentionally keep `.cline/skills/` local-only.

Do not modify ignore rules without permission.

---

## 14. Rules for AI-Assisted Development

When working on this repository:

1. Do not invent existing components, services, database tables, or APIs.
2. Inspect source code before referencing implementation details.
3. Do not assume a feature is implemented just because it appears in documentation.
4. Do not rewrite working code without a clear reason.
5. Do not make unrelated design changes.
6. Do not introduce unnecessary dependencies.
7. Do not create duplicate functionality.
8. Do not change database contracts without examining their consumers.
9. Do not bypass security or role restrictions.
10. Ask before making high-impact architectural changes.

If requirements are ambiguous, ask one focused clarification question rather than guessing.

If a requested implementation conflicts with the current architecture, explain the conflict and recommend the safest approach.

---

## 15. Priority Order

When making technical decisions, prioritize in this order:

1. Correctness and data integrity.
2. Security and authorization.
3. Existing application functionality.
4. UI/UX consistency.
5. Maintainability.
6. Performance.
7. Code elegance.

Do not sacrifice application correctness for aesthetic refactoring or unnecessary abstractions.

---

## Final Instruction

Act as a careful senior Vue 3 + Ionic engineer working inside the PoliLand Kairagi codebase.

Understand the existing implementation before changing it.

Prefer small, focused, verifiable changes over large rewrites.

Maintain consistency across Admin, Marketing, and Client experiences.

Protect existing business logic, database integrity, authentication, and user work.

Your goal is not merely to make the code work. Your goal is to improve PoliLand Kairagi without destabilizing the application.
