<div align="center">

  # ☁️ Lumina (StackCloud)
  **Store like a Pro — A Modern Full-Stack Cloud Storage & File Management Platform**

  [![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Appwrite](https://img.shields.io/badge/Appwrite-Cloud-F02E65?style=for-the-badge&logo=appwrite&logoColor=white)](https://appwrite.io/)

  <p align="center">
    A fast, secure, and intuitive cloud storage web application inspired by Google Drive and Dropbox. Built with Next.js 16 App Router, Appwrite Cloud, React 19, and Tailwind CSS.
  </p>

  [Features](#-key-features) •
  [Tech Stack](#-tech-stack) •
  [Architecture](#-appwrite-backend-architecture) •
  [Getting Started](#-getting-started) •
  [Environment Variables](#-environment-variables) •
  [Project Structure](#-project-structure)

</div>

---

## 🌟 Key Features

- **🔐 Passwordless OTP Authentication**
  - Instant login and account creation via secure email OTP (One-Time Password) powered by Appwrite Auth.
  - Automatic session management backed by secure HTTP-only cookies.

- **📤 Drag & Drop File Uploading**
  - Seamless multi-file upload with progress tracking and validation (supports uploads up to 50MB per file).
  - Powered by `react-dropzone` with instant optimistic feedback and toast alerts (`sonner`).

- **📂 Smart Categorization & Organization**
  - Automatically indexes and groups uploaded files into **Documents**, **Images**, **Media** (Audio/Video), and **Others**.
  - Dedicated dynamic category routes with instant summaries of space consumption per category.

- **⚡ Comprehensive File Operations**
  - **Rename:** Easily update file names while preserving original file extensions.
  - **Share:** Collaborate by granting access to other users through their registered email addresses.
  - **Details:** Inspect file metadata including extension, file size, upload timestamp, and owner details.
  - **Download:** Fast and direct one-click secure downloads straight from Appwrite Storage.
  - **Delete:** Full deletion with automatic cascade cleanup in both Appwrite Database and Storage Buckets.

- **🔍 Global Search & Multi-Criteria Filtering**
  - Real-time search with URL query synchronization across your entire file vault.
  - Sort by **Name** (A–Z / Z–A), **Date Created** (Newest / Oldest), and **File Size** (Highest / Lowest).

- **📊 Storage Quota & Analytics Dashboard**
  - Interactive storage usage progress bar tracking total allocated capacity against a user quota (e.g. 2 GB default limit).
  - "Recently Modified" files table providing quick visibility and action shortcuts for recent assets.

- **🎨 Modern, Fluid UI & Micro-Animations**
  - Crafted with Tailwind CSS v4, Radix UI, and Shadcn primitives.
  - Fluid interactions and smooth state transitions powered by GSAP.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Server Components) |
| **Frontend Library** | [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & Design** | [Tailwind CSS v4](https://tailwindcss.com/), Radix UI Primitives, Lucide Icons |
| **Animations** | [GSAP](https://gsap.com/), tw-animate-css |
| **Backend as a Service (BaaS)** | [Appwrite Cloud](https://appwrite.io/) (`node-appwrite`) |
| **Authentication** | Appwrite Email Token (OTP Auth) & Session Cookies |
| **Database & Storage** | Appwrite TablesDB & Appwrite Storage Buckets |
| **File Handling** | `react-dropzone`, `input-otp` |
| **Notifications** | `sonner` (Toast Alerts) |

---

## 🏗️ Appwrite Backend Architecture

Lumina relies on Appwrite Cloud for authentication, storage, and metadata management:

1. **Authentication**: Uses `account.createEmailToken` to send 6-digit OTPs directly to user emails and `account.createSession` to issue secure credentials.
2. **Database (`appwriteConfig.databaseId`)**:
   - **`users` Collection**: Stores user profile records (`fullName`, `email`, `avatar`, `accountId`).
   - **`files` Collection**: Stores metadata for each uploaded asset (`name`, `url`, `type`, `extension`, `size`, `owner`, `ownerId`, `accountId`, `users`, `bucketFileId`).
3. **Storage (`appwriteConfig.bucketId`)**:
   - Manages raw binary files with unique IDs, configured with appropriate read/write permissions for authorized users.

---

## 🚀 Getting Started

Follow these steps to set up and run Lumina locally on your machine.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.17.0 or higher recommended)
- [npm](https://www.npmjs.com/), [pnpm](https://pnpm.io/), or [yarn](https://yarnpkg.com/)
- An active [Appwrite Cloud](https://cloud.appwrite.io/) account (or self-hosted Appwrite instance)

### 1. Clone the Repository

```bash
git clone https://github.com/Jayant-Datta/StackCloud.git
cd StackCloud
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Duplicate the template `.env.example` file to create your `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in your Appwrite project credentials:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT_ID="your_appwrite_project_id"
NEXT_PUBLIC_APPWRITE_PROJECT_NAME="Lumina"
NEXT_PUBLIC_APPWRITE_KEY="your_appwrite_secret_api_key"
NEXT_PUBLIC_APPWRITE_DATABASE="your_database_id"
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION="users"
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION="files"
NEXT_PUBLIC_APPWRITE_BUCKET="your_storage_bucket_id"
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_APPWRITE_ENDPOINT` | The API URL for your Appwrite instance (e.g. `https://cloud.appwrite.io/v1`) |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID` | Your unique Appwrite Project ID |
| `NEXT_PUBLIC_APPWRITE_PROJECT_NAME` | Project name display (default: `Lumina` or `StackCloud`) |
| `NEXT_PUBLIC_APPWRITE_KEY` | Admin Secret API Key generated from the Appwrite Console (with full Auth, Database, and Storage scopes) |
| `NEXT_PUBLIC_APPWRITE_DATABASE` | ID of the Appwrite Database containing your collections |
| `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION` | ID or name of the collection storing user profile documents |
| `NEXT_PUBLIC_APPWRITE_FILES_COLLECTION` | ID or name of the collection storing file records |
| `NEXT_PUBLIC_APPWRITE_BUCKET` | ID of the Appwrite Storage Bucket used for uploaded files |

---

## 📁 Project Structure

```text
├── app/
│   ├── (auth)/             # Authentication route group (sign-in, sign-up, OTP modal)
│   ├── (root)/             # Protected application layout & dashboard
│   │   ├── [type]/         # Dynamic categorized views (documents, images, media, others)
│   │   ├── layout.tsx      # Main application shell with sidebar and header
│   │   └── page.tsx        # Dashboard home with overview metrics & recent files
│   ├── globals.css         # Global Tailwind styles and themes
│   └── layout.tsx          # Root HTML & body layout
├── components/
│   ├── ui/                 # Reusable UI primitives (dialog, dropdown, table, input, sonner)
│   ├── ActionDropdown.tsx  # Context menu for file operations (rename, share, download, delete)
│   ├── Card.tsx            # Grid card view component for files
│   ├── FileCard.tsx        # Dashboard storage metric card
│   ├── FileSearch.tsx      # Real-time search bar with debouncing
│   ├── FileUploader.tsx    # Drag-and-drop file uploader modal with dropzone
│   ├── Filter.tsx          # Sorting selector dropdown
│   ├── Header.tsx          # Top navigation bar with search and actions
│   ├── OTPModel.tsx        # Verification code dialog for login
│   ├── Sidebar.tsx         # Collapsible sidebar with navigation and storage capacity gauge
│   └── ...
├── lib/
│   ├── appwrite/           # Appwrite SDK client config, server actions, and query builders
│   │   ├── appwriteConfig.ts
│   │   ├── file.action.ts  # Upload, rename, delete, share, and query file operations
│   │   ├── index.ts        # Appwrite Admin Client generator
│   │   └── user.action.ts  # User authentication and session handlers
│   ├── constants.ts        # Navigation items, action items, limits, and filter definitions
│   ├── types.ts            # TypeScript interfaces & types
│   └── utils.ts            # File formatting, size calculations, and URL helpers
├── public/                 # Static SVG icons and image assets
├── .env.example            # Environment variables template
├── package.json            # Project dependencies and npm scripts
└── README.md               # Project documentation
```

---

## 📜 Available Scripts

In the project directory, you can run:

- **`npm run dev`**: Starts the local development server with Turbopack / Fast Refresh on `http://localhost:3000`.
- **`npm run build`**: Compiles and optimizes the application for production deployment.
- **`npm run start`**: Starts the Next.js production server.
- **`npm run lint`**: Runs ESLint to check for code style issues and bugs.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/Jayant-Datta/StackCloud/issues) if you'd like to contribute.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

