# Firebase Setup for ITFORP NOVA

## Quick Start (Mock Data)

The app runs with mock data by default — no Firebase needed. Just:

```bash
npm start
```

Scan the QR code with **Expo Go** on your phone.

---

## Connect to Firebase (Production)

### 1. Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `itforp-nova`
3. Enable **Google Analytics** (optional)

### 2. Enable Authentication

1. In the Firebase console → **Authentication** → **Get started**
2. Enable **Email/Password** provider

### 3. Create Firestore Database

1. **Firestore Database** → **Create database**
2. Choose **Start in test mode** (update rules before going to production)
3. Pick a region close to your users

### 4. Get Your Config

1. **Project Settings** (gear icon) → **Your apps** → Add a **Web app**
2. Copy the `firebaseConfig` object

### 5. Update the Config File

Open `src/config/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: 'YOUR_ACTUAL_API_KEY',
  authDomain: 'itforp-nova.firebaseapp.com',
  projectId: 'itforp-nova',
  storageBucket: 'itforp-nova.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
};
```

### 6. Switch to Live Data

In both `src/hooks/useJobs.js` and `src/hooks/useNotes.js`, change:

```js
const USE_MOCK = false; // was: true
```

### 7. Firestore Data Schema

```
jobs/
  {jobId}/
    jobNumber: string          // e.g. "25S00101"
    status: "in_progress" | "completed"
    client: {
      name: string
      storeNumber: string
      address: string
      contacts: [{ name, role, phone }]
    }
    description: string
    trips: [{
      id: string
      tripNumber: number
      scheduledAt: Timestamp
      status: "scheduled" | "completed"
      scopeOfWork: string
    }]
    nextTrip: Timestamp | null
    attachments: []
    createdAt: Timestamp

  {jobId}/notes/
    {noteId}/
      text: string
      author: string           // user email
      tripNumber: number
      createdAt: Timestamp
```

### 8. Firestore Security Rules (Production)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /jobs/{jobId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;

      match /notes/{noteId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```
