# System Architecture

The Emotist project is designed as a modular **monorepo** prioritizing strong decoupling, clean architecture, and Domain-Driven Design (DDD) principles.

---

## 🏗️ Folder Structure

```
emotist-app/
├── apps/
│   ├── api/            # NestJS Backend API service
│   ├── therapist/      # Therapist web app (React SPA)
│   ├── client/         # Client web app (React SPA)
│   └── client-app/     # Client mobile app (React Native/Expo)
├── packages/
│   ├── react-components/   # Component library (@therapeutic/react-components)
│   ├── utils/              # Common utilities (@therapeutic/utils)
│   └── workspace/          # Centralized configuration (ESlint, TsConfig)
```

---

## ⚙️ Backend Architecture (DDD & Bounded Contexts)

The NestJS backend (`apps/api/src/`) divides logic into separate **Bounded Contexts** to restrict cross-domain side effects:

- **Therapist Context**: Deals with therapist profiles, specialized categories, professional background, verification workflows, availability scheduling, and consultation settings.
- **Client Context**: Deals with client registrations, assigned clinical tasks (mood tracking, journal templates), and task logs.
- **Appointment Context**: Manages session scheduling, order checkout, slot configurations, out-of-office blocks, and Google Calendar sync.

### Layers within Bounded Contexts
Inside each bounded context (e.g., `src/therapist/`), logic is split into standard DDD layers:

```
[Client / HTTP Request]
          │
          ▼
   1. INFRASTRUCTURE  ──► Controllers (AccountSetupController, WorkDetailsController)
          │               DTOs, Persistence (Supabase schemas)
          ▼
   2. APPLICATION     ──► Use Cases, Services (ITherapistService), Cqrs Commands/Queries
          │
          ▼
   3. DOMAIN          ──► Entities (Models), Repositories contracts, Domain Events
```

1. **Domain Layer**: The heart of business logic. Contains pure model entities, domain events (e.g. `WorkDetailsUpdatedEvent`), and Repository interfaces (interfaces, no implementation details).
2. **Application Layer**: Orchestrates use cases. Houses services (e.g., `TherapistService`), DTO mappers, and CQRS Query/Command handlers.
3. **Infrastructure Layer**: Concrete implementation details. Contains NestJS controllers (REST endpoints), HTTP DTO validators, and database repositories mapping queries directly to Supabase schemas.

---

## 🗃️ Shared Workspace Packages

To prevent code duplication, reusable helpers and components are extracted as yarn/npm packages under the `/packages` folder:

### 1. Reusable Component Library (`packages/react-components`)
- **Technology**: React + Vite + Vitest + Playwright Component Testing (CT).
- Contains general button items, inputs, dialog modals, calendar pickers, and shell layouts used by both frontend applications.
- Storybook integration runs locally on `http://localhost:6006` for designers to audit.

### 2. Utilities Package (`packages/utils`)
- Standardized validators, date formatting modules, timezone calculations, and HTTP clients.

---

## 🔄 Event-Driven Workflows (BullMQ & Outbox)

To ensure reliable communication between contexts and external systems, Emotist implements an **Outbox Pattern**:

1. A business command (like scheduling an appointment) saves both the core record and an event log inside a single database transaction.
2. A background worker picks up pending outbox rows and publishes them to **BullMQ** (powered by Redis).
3. BullMQ consumers process events asynchronously:
   - Synchronizing appointments with Google Calendar APIs.
   - Dispatching email reminders using SendGrid.
   - Processing billing receipts via Stripe webhooks.
