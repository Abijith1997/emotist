# Installation & Local Setup

This guide will walk you through setting up and running the Emotist ecosystem on your local machine.

---

## 🛠️ Prerequisites

Before you get started, ensure you have the following installed:

- **Git** & **Git LFS** (Git Large File Storage — required for static resource files)
- **Docker Desktop** (For running local Supabase and Redis containers)
- **Volta** (Pinning Node.js version to `22.11.0` in root `package.json` for environment alignment)

---

## 🚀 Step 1: Clone and Install Workspaces

Clone the repository and install all node packages from the monorepo root:

```bash
git clone https://github.com/emotist/emotist-app.git
cd emotist-app

# Install all workspace dependencies
npm install

# Build shared packages (@therapeutic/utils, @therapeutic/react-components)
npm run build:packages
```

---

## 💾 Step 2: Database & Infrastructure Setup

We use **Docker Desktop** to run Supabase (PostgreSQL) and Redis locally:

### 1. Initialize Supabase Folders
Before starting the database for the first time, create folders for local file assets storage:

```bash
cd apps/api
mkdir -p supabase/assets supabase/private-assets
cd ../..
```

### 2. Manage Infrastructure Containers
Run infrastructure actions from the root directory:

```bash
npm run db:start          # Starts local Supabase container instances
npm run db:status         # Prints URLs, anon keys, and service keys
npm run db:migration:up   # Applies pending schema migrations
npm run db:reset          # Resets database schemas (destructive, local only)
npm run redis:start       # Starts BullMQ Redis cache instance
```

> [!WARNING]
> **Apple Silicon Mac Users (M1/M2/M3):**
> On ARM-based macOS, `npm run db:start` excludes a few broken container images (`storage-api`, `postgres-meta`, `studio`). Core auth and APIs operate normally, but Supabase Studio or file storage uploads may not be locally available until the Supabase CLI is upgraded to version 2.

---

## 🔑 Step 3: Seed Database & Export Configurations

With Supabase and Redis running, seed mock users and generate static layouts:

```bash
# Export email templates (run this from apps/api)
cd apps/api
npm run email:export

# Seed test database profiles (therapists and clients)
npm run db:seed
cd ../..
```

---

## 💻 Step 4: Run Services (3 Terminals)

For everyday local development, spin up the applications in three separate terminal windows:

### Terminal 1: Backend API
```bash
# Auto-starts database + redis if they are stopped
npm run app:api:dev
# → Server running at: http://localhost:3000
# → Swagger API Docs: http://localhost:3000/swagger
```

### Terminal 2: Therapist Portal
```bash
npm run app:therapist:dev
# → Web app running at: http://localhost:5173
```

### Terminal 3: Client Web or Client Mobile
```bash
# Client Web SPA:
npm run app:client:dev
# → Web app running at: http://localhost:5173 (Ensure Therapist portal runs on different port or toggle ports)

# Client Mobile (Expo App - run directly):
cd apps/client-app
npm install
npm start
```

---

## 🧪 Test Accounts

The following test profiles are populated when you run `npm run db:seed`:

| Persona | Email | Password | Phone | Verification OTP |
| :--- | :--- | :--- | :--- | :--- |
| **Therapist 1** | `therapist1@example.com` | `p@ssword1234` | `+919876543210` | `123456` |
| **Therapist 2** | `therapist2@example.com` | `p@ssword1234` | `+919876543211` | `123456` |
| **Client 1** | `client1@example.com` | `p@ssword1234` | `+919876543220` | `123456` |

- **Local Inbox Verification**: Test email verification and activation emails are intercepted locally. You can access the mock inbox client at [http://localhost:54324](http://localhost:54324) (Inbucket).
