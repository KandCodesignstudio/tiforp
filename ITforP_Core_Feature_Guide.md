# ITforP Core — Feature Guide
**Version 1.0 | Field Technician Operations Platform**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Login & Authentication](#2-login--authentication)
3. [Jobs List](#3-jobs-list)
4. [Job Detail — Overview Tab](#4-job-detail--overview-tab)
5. [Job Detail — Instructions Tab](#5-job-detail--instructions-tab)
6. [Job Detail — Attachments Tab](#6-job-detail--attachments-tab)
7. [Job Detail — Notes Tab](#7-job-detail--notes-tab)
8. [Job Detail — Chat Tab](#8-job-detail--chat-tab)
9. [Dashboard (Admin)](#9-dashboard-admin)
10. [Calendar (Admin)](#10-calendar-admin)
11. [Create & Edit Job (Admin)](#11-create--edit-job-admin)
12. [Notifications](#12-notifications)
13. [Profile](#13-profile)
14. [Key Workflows](#14-key-workflows)

---

## 1. Overview

**ITforP Core** is a mobile field technician operations platform built for IT service companies. It connects office administrators with field technicians in real time, managing the full lifecycle of every job — from scheduling and dispatch to check-in, work completion, approvals, and invoicing.

The platform is role-based: **Admins** have full visibility and control, while **Field Technicians** see only their assigned work and the tools needed to execute it.

**Platform:** iOS & Android (React Native / Expo)
**Backend:** Supabase (real-time database, file storage, push notifications)

---

## 2. Login & Authentication

> **[SCREENSHOT: Login Screen]**
> *Caption: The ITforP Core login screen with company branding*

### Features

- **Branded Login Screen** — Displays the ITforP logo against the company color scheme. If the logo fails to load, a styled text fallback ("ITforP CORE") is shown automatically.
- **Email & Password Login** — Secure authentication via Supabase Auth.
- **Password Reset** — "Reset Password" link sends a reset email directly to the user.
- **Sign Up** — New technician accounts can be created from the login screen (subject to admin approval/setup).
- **Persistent Session** — Users remain logged in between app sessions. The app navigates directly to the main screen on relaunch.

---

## 3. Jobs List

> **[SCREENSHOT: Jobs List — Admin View]**
> *Caption: Admin view showing all jobs grouped by status*

> **[SCREENSHOT: Jobs List — Technician View]**
> *Caption: Technician view showing only their assigned jobs*

### Features

- **Role-Based Visibility**
  - Admins see all jobs across all technicians.
  - Technicians see only jobs assigned to them.

- **Status Sections** — Jobs are automatically grouped into labeled sections:
  - **Active** — Jobs currently in progress
  - **Pending Approval** — Completed work awaiting admin sign-off
  - **Scheduled** — Upcoming jobs
  - **Completed** — Finished and approved jobs
  - **Closed** — Fully resolved and archived jobs

- **Job Cards** — Each card shows:
  - Job number, client name, and site address
  - Current status with color-coded badge
  - Assigned technician name
  - Scheduled date
  - Star rating (if reviewed)
  - Payment status indicators (Admin only)

- **Pull-to-Refresh** — Swipe down to manually refresh the job list.
- **Real-Time Updates** — The list automatically updates when any job changes, without requiring manual refresh. Uses Supabase real-time subscriptions with a 15-second polling fallback to ensure data stays current even in poor network conditions.
- **Auto-Refresh on Focus** — Whenever the user returns to the Jobs screen (e.g., after viewing a job detail), the list refreshes automatically.

---

## 4. Job Detail — Overview Tab

> **[SCREENSHOT: Job Detail Overview — Top Section]**
> *Caption: Job header with client info, address, and action buttons*

> **[SCREENSHOT: Job Detail Overview — Trip Card]**
> *Caption: Trip card showing status, scheduled time, and action button*

> **[SCREENSHOT: Job Detail Overview — Collapsible Description]**
> *Caption: Job description card expanded and collapsed*

> **[SCREENSHOT: Job Detail Overview — Scope of Work Expanded]**
> *Caption: Scope of work section expanded inside a trip card*

> **[SCREENSHOT: Job Detail Overview — Reschedule Request Banner (Admin)]**
> *Caption: Orange banner alerting admin to a technician's reschedule request*

### Features

**Job Header**
- Displays job number, client name, site address (tappable to open Maps), and job description.
- **Collapsible Description Card** — The job description section can be tapped to expand or collapse, keeping the screen clean when details aren't needed.
- Admin-only: "Edit Job" and "Export Work Order PDF" buttons appear at the top.

**Trip Cards**
Each job can have multiple trips (site visits). Each trip card shows:
- Trip number, scheduled date/time, and assigned technician
- Current status with a color-coded badge
- **Collapsible Scope of Work** — Each trip's scope of work section can be individually expanded or collapsed. Only the header is visible when collapsed, with a chevron indicating it can be opened.
- Duration (for completed trips)
- Check-in GPS location and timestamp (for checked-in trips)

**Trip Status Workflow**

The trip progresses through these statuses, advanced by a single action button:

| Status | Button Label | Who Can Advance |
|---|---|---|
| Scheduled | Go En Route | Technician |
| En Route | Check In | Technician |
| Checked In | Check Out | Technician |
| Checked Out | Submit for Approval | Technician |
| Pending Approval | Approve / Complete | Admin |
| Completed | — | — |

**GPS Check-In Verification**
When a technician taps "Check In," the app verifies their GPS location against the job site address. If they are more than 500 meters away, they are warned and asked to confirm they are on-site before proceeding.

**Future Date Block (Reschedule Request Workflow)**
If a trip is scheduled for a future date:
- The technician **cannot** tap "Go En Route."
- Instead, they can send a reschedule request to the admin explaining why they need to move the trip to today.
- The admin sees an **orange banner** on the trip card: *"Reschedule Request from [technician name]"*.
- The admin can tap the banner to **reschedule the trip to today** (sets time to 9:00 AM), or dismiss it.
- When rescheduled, the technician receives a push notification and the action is logged in the event history.

**Digital Signature**
When a technician submits for approval, they can capture a digital signature from the client on-screen before submitting.

**Tech Review / Star Rating**
After completing a trip, the admin can leave a star rating and written review for the technician. This rating appears on job cards and the technician's profile.

**Admin Trip Management**
Admins can:
- Add new trips to a job with a date, scope of work, and assigned technician
- Edit existing trip details (date, scope of work)
- Delete trips
- Assign or reassign a technician to any trip
- Remove a technician from a trip

**Export Work Order PDF**
Admins can generate and share a professional PDF work order for any job with a single tap.

---

## 5. Job Detail — Instructions Tab

> **[SCREENSHOT: Instructions Tab]**
> *Caption: Instructions tab showing trip selector and scope of work details*

### Features

- **Trip Selector** — Horizontally scrollable tabs let the user switch between trips. The currently viewed trip's status is shown as a colored chip.
- **Scope of Work** — Full text of the scope of work for the selected trip, displayed with bullet points for easy reading.
- **Scheduled Date & Time** — Shows the exact scheduled date and time for the selected trip.

---

## 6. Job Detail — Attachments Tab

> **[SCREENSHOT: Attachments Tab — Grid View]**
> *Caption: Attachments tab showing uploaded photos and documents*

> **[SCREENSHOT: Attachments Tab — FAB Menu]**
> *Caption: Floating action button expanded with camera, library, and document options*

### Features

- **Trip-Based Organization** — Attachments are organized by trip. A dropdown or chip selector lets the user switch between trips.
- **Photo Grid** — Uploaded images are displayed in a responsive grid. Tap any image to view it full-screen.
- **Document List** — Non-image files (PDFs, Word documents, etc.) are listed with their filename and size.
- **Add Attachments (FAB)** — A floating action button opens three options:
  - **Take Photo** — Opens the device camera to capture a new photo directly.
  - **Photo Library** — Opens the device photo library to select an existing image.
  - **Document / File** — Opens the file picker to upload any document type.
- **Automatic Image Compression** — All photos (whether taken with the camera or selected from the library) are automatically resized and compressed before uploading. Images are scaled down to a maximum of 1920px on the longest side at 75% JPEG quality. This drastically reduces upload time and storage costs without noticeable quality loss.
- **Delete Attachments** — Long-press any attachment to delete it (with confirmation).

---

## 7. Job Detail — Notes Tab

> **[SCREENSHOT: Notes Tab]**
> *Caption: Notes tab with trip filter and note entries*

### Features

- **Trip-Filtered Notes** — Notes can be filtered by trip number, or viewed all at once.
- **Add Notes** — Any user with access to the job can add a text note, which is timestamped and attributed to the author.
- **Admin Notifications** — When a technician adds a note, admins receive a push notification. The technician who wrote the note does not receive a notification about their own action.

---

## 8. Job Detail — Chat Tab

> **[SCREENSHOT: Chat Tab]**
> *Caption: Real-time chat between technician and admin on a job*

### Features

- **Per-Job Chat** — Each job has its own dedicated chat thread between the assigned technician(s) and admins.
- **Real-Time Messaging** — Messages appear instantly for all participants via Supabase real-time.
- **Message Attribution** — Each message shows the sender's name and timestamp.
- **No Chat Push Notifications** — Chat messages intentionally do not trigger push notifications, keeping notification noise low. Users check the chat tab directly when needed.

---

## 9. Dashboard (Admin)

> **[SCREENSHOT: Dashboard — Stats Cards]**
> *Caption: Admin dashboard showing job statistics at a glance*

> **[SCREENSHOT: Dashboard — Technician List]**
> *Caption: Dashboard technician workload section*

### Features

*Admin-only screen.*

**Job Statistics Cards** — At-a-glance KPIs updated in real time:
- **Total Jobs** — All jobs in the system
- **Active** — Jobs currently in progress
- **Pending Approval** — Jobs awaiting admin sign-off
- **Completed** — Successfully finished jobs
- **Closed** — Fully archived jobs
- **Unpaid** — Completed jobs where client or technician payment is outstanding
- **This Month** — New jobs created in the current calendar month

**Technician Workload** — A ranked list of technicians sorted by number of assigned jobs. Tap any technician to see all jobs assigned to them.

---

## 10. Calendar (Admin)

> **[SCREENSHOT: Calendar Screen — Month View]**
> *Caption: Calendar showing job dots on scheduled dates*

> **[SCREENSHOT: Calendar Screen — Day Detail]**
> *Caption: Selected day showing all trips scheduled for that date*

### Features

*Admin-only screen.*

- **Monthly Calendar View** — Navigate month by month. Each day with scheduled trips shows colored indicator dots (up to 3 visible, with a "+N" overflow indicator).
- **Day Detail Panel** — Tap any date to see a list of all trips scheduled for that day, including:
  - Job number and client name
  - Trip number
  - Trip status with color-coded badge
- **Tap to Open** — Tap any trip row to navigate directly to that job's detail screen.

---

## 11. Create & Edit Job (Admin)

> **[SCREENSHOT: Create Job Screen]**
> *Caption: Admin creating a new job with client and site details*

> **[SCREENSHOT: Edit Job Screen]**
> *Caption: Admin editing an existing job's details*

### Features

*Admin-only screens.*

**Create Job**
Admins can create a new job with:
- **Job Number** — Unique identifier for the job
- **Title / Description** — Brief description of the work to be performed
- **Client Name** — The customer or company name
- **Store / Unit Number** — Location identifier (optional)
- **Site Address** — Full street address of the work site
- **Custom Fields** — Admins can add any number of custom label/value pairs (e.g., "PO Number", "Contract ID", "Contact Person") for job-specific metadata

**Edit Job**
All fields from job creation can be updated at any time from the Job Detail screen.

**Import Jobs (CSV)**
Admins can bulk-import jobs from a CSV file, mapping columns to job fields.

**Add Technician**
Admins can add new technician accounts to the system from within the app.

---

## 12. Notifications

> **[SCREENSHOT: Notifications Screen]**
> *Caption: Notification inbox with unread indicators*

### Features

- **In-App Notification Inbox** — All notifications are stored and accessible from the bell icon in the navigation bar.
- **Unread Indicators** — Unread notifications are shown in bold with a visual badge. A banner at the top of the screen shows the unread count with a "Mark all read" shortcut.
- **Tap to Navigate** — Tapping a notification opens the relevant job directly.
- **Delete Notifications** — Swipe or tap the delete icon to remove individual notifications.
- **Push Notifications** — Devices receive push notifications for key events, including:
  - Job status changes (en route, checked in, checked out, submitted for approval, approved)
  - New notes added to a job
  - Reschedule requests from technicians
  - Reschedule approvals (tech is notified when admin moves the date to today)
- **Smart Filtering** — Users never receive notifications for their own actions. Admins are not notified when they take an action on a job themselves.

---

## 13. Profile

> **[SCREENSHOT: Profile Screen]**
> *Caption: User profile screen showing account details and logout*

### Features

- **Account Information** — Displays the user's full name, email address, and role (Admin or Field Technician).
- **Avatar** — A circular avatar displays the user's initials.
- **App Version** — The current app version is shown at the bottom for easy reference during support calls.
- **Logout** — A confirmation dialog prevents accidental logouts. On confirmation, the user is returned to the Login screen.

---

## 14. Key Workflows

### 14.1 Full Job Lifecycle (Technician)

```
Job Assigned
    ↓
Technician receives push notification
    ↓
Opens job in Jobs List → Job Detail
    ↓
Reads scope of work in Instructions tab
    ↓
Day of job: taps "Go En Route"  [blocked if future date — see 14.2]
    ↓
Arrives on site: taps "Check In" (GPS verified)
    ↓
Completes work, takes photos, adds notes
    ↓
Taps "Check Out"
    ↓
Captures client signature (optional)
    ↓
Taps "Submit for Approval"
    ↓
Admin is notified → Admin reviews and approves
    ↓
Job moves to Completed
```

### 14.2 Reschedule Request Workflow

When a trip is scheduled for a future date, the technician cannot start travel:

```
Technician taps "Go En Route" on a future-dated trip
    ↓
App shows message: "This trip is scheduled for [date]"
    ↓
Technician taps "Send Request" → enters reason
    ↓
Reschedule request saved to the trip record
    ↓
Admin receives push notification
    ↓
Admin opens job → sees orange banner on the trip card
    ↓
Admin taps banner → chooses "Reschedule to Today"
    ↓
Trip date updated to today at 9:00 AM
    ↓
Technician receives push notification: trip is ready
    ↓
Action logged in Event History
```

### 14.3 Multi-Trip Jobs

A single job can have multiple trips (site visits), for example in cases requiring follow-up work:

- Each trip has its own scope of work, scheduled date, assigned technician, attachments, and notes.
- Trips are numbered sequentially (Trip 1, Trip 2, etc.).
- Admins can add additional trips at any time from the Overview tab.
- The Instructions, Attachments, Notes, Chat, and Overview tabs all have trip selectors to view data per trip.

### 14.4 Payment Tracking

- Jobs track two payment flags: **Client Paid** and **Tech Paid**.
- Admins can toggle these flags on any completed job.
- The Dashboard highlights unpaid jobs so nothing falls through the cracks.

### 14.5 Event History

Every significant action on a job is automatically logged with a timestamp and the user who performed it:
- Status changes (en route, check-in, check-out, submitted, approved)
- Reschedule requests and approvals
- Technician assignments and removals
- Notes and attachment uploads

This creates a complete audit trail for every job.

---

## Appendix: Role Permissions Summary

| Feature | Admin | Technician |
|---|---|---|
| View all jobs | ✅ | ❌ (own only) |
| Create / Edit jobs | ✅ | ❌ |
| Add / Edit / Delete trips | ✅ | ❌ |
| Assign technicians | ✅ | ❌ |
| Approve completed trips | ✅ | ❌ |
| Reschedule trips | ✅ | ❌ (request only) |
| Export PDF work orders | ✅ | ❌ |
| View Dashboard & Calendar | ✅ | ❌ |
| Import jobs (CSV) | ✅ | ❌ |
| Add technician accounts | ✅ | ❌ |
| Advance trip status (en route → check-in → etc.) | ❌ | ✅ |
| Upload photos & documents | ✅ | ✅ |
| Add notes | ✅ | ✅ |
| Send chat messages | ✅ | ✅ |
| Leave tech reviews / star ratings | ✅ | ❌ |

---

*ITforP Core — © 2026 ITFORP. All rights reserved.*
*Designed by kandcodesignstudio.com*
