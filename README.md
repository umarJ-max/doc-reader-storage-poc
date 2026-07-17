# Doc Tools

A native Android document management and PDF toolkit built with Expo and React Native. Doc Tools scans your device for documents, images, and media, organizes them by category, and provides a set of on-device PDF utilities — all with no cloud upload and no internet dependency for file operations.

## Features

**File Discovery**
- Automatic device scan on app launch and on every return to foreground — no manual "scan" button required
- Files organized into categories: PDF, Word, Excel, PowerPoint, Text, Compressed, Images, Videos
- Instant search across all discovered files
- Recently opened files and bookmarks
- Internal storage and memory card usage overview
- Native filtering that excludes thumbnails, cache files, and hidden/corrupt entries so only real user files appear

**PDF Tools**
- **Merge PDF** — combine two or more PDFs into a single file
- **Split PDF** — split a PDF into two equal halves
- **Watermark PDF** — overlay custom text onto every page
- **PDF to Image** — export each page as an image
- **Images to PDF** — convert selected JPG/PNG images into a single PDF, one image per page

**Utilities**
- **Notes** — quick on-device note-taking with local persistence
- **Scan QR Code / Barcode** — camera-based scanner with copy-to-clipboard
- **WhatsApp Direct Chat** — open a chat with any number without saving it as a contact

## Tech Stack

- **Framework:** Expo (React Native) with TypeScript
- **Navigation:** Expo Router (file-based routing)
- **PDF Processing:** [pdf-lib](https://github.com/Hopding/pdf-lib)
- **Native Module:** Custom Kotlin Expo module (`media-store-scanner`) for querying Android's MediaStore directly — faster and more reliable than JS-based file system scans
- **Camera/Scanning:** `expo-camera`
- **Local Storage:** `@react-native-async-storage/async-storage`
- **Build:** EAS Build (Expo Application Services)

## Project Structure

```
src/
├── app/                    # Screens (Expo Router file-based routes)
│   ├── index.tsx           # Home / file discovery screen
│   ├── merge-pdf.tsx
│   ├── split-pdf.tsx
│   ├── watermark-pdf.tsx
│   ├── pdf-to-image.tsx
│   ├── images-to-pdf.tsx
│   ├── notes.tsx
│   ├── scan.tsx
│   ├── whatsapp-chat.tsx
│   └── settings.tsx
├── components/              # Shared UI components
├── constants/                # Theme and color tokens
└── hooks/                    # Shared hooks

modules/
└── media-store-scanner/    # Custom native Expo module (Kotlin) for MediaStore access
```

## Getting Started

### Prerequisites

- Node.js and npm
- An Expo account (for EAS Build)
- Android device or emulator for testing (this app relies on native modules, so it will **not** run in Expo Go)

### Installation

```bash
git clone https://github.com/umarj-max/doc-tools.git
cd doc-tools
npm install
```

### Development Build

Since this project includes a custom native module, you need a development client rather than Expo Go:

```bash
eas build --platform android --profile development
```

### Production APK

```bash
eas build --platform android --profile production
```

## Permissions

Doc Tools requests **All Files Access** (`MANAGE_EXTERNAL_STORAGE`) on Android to scan and manage documents across device storage. This permission is requested from within the app with a clear explanation before the user is directed to the system settings toggle. No file data leaves the device — all scanning and processing happens locally.

## License

This project is provided as-is for personal and educational use.

---
Built by Umar J
