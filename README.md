# Ours

A warm, personal couples calendar for coordinating life one week at a time.

Native **SwiftUI** iPhone app. Your schedule is the primary layer, your partner’s sits softly underneath, and shared plans glow as a distinct third type. Accounts, events, and sharing live in Supabase. Google Calendar is an optional connection.

## Features

- **Week-at-a-time calendar** with day strip + layered day timeline
- **Three event layers**: yours, partner, together
- **Create individual plans** or **send shared requests**
- **Accept / suggest a different time / decline** on incoming requests
- **Voice quick-add** with mock speech recognition + natural language parsing
- **Find Time Together** — intersects both calendars and offers mutual free windows
- **Sign in** with email, Apple, or Google
- **One partner** with a live shared calendar
- **Temporary availability** — another logged-in person can find a mutual time without seeing event titles
- **Optional Google Calendar** read and write for your own events

## Run

```bash
cd Ours
xcodegen generate   # only after project.yml changes
open Ours.xcodeproj
```

Then press **Run** in Xcode (iOS 17+ Simulator or device).

## Backend

Copy `Ours/Secrets.xcconfig.example` to `Ours/Secrets.xcconfig` and set `SUPABASE_URL` and `SUPABASE_ANON_KEY`. In an xcconfig, write the URL as `https:/$()/your-project.supabase.co`.

Schema lives in `supabase/migrations`. Google Calendar sync is the `google-oauth` and `google-sync` edge functions. Sign in with Apple needs an Apple Developer team on the Xcode target. Google sign-in and Calendar need a Google OAuth client, with the Calendar client id and secret set as function secrets.

## Stack

- SwiftUI · iOS 17+
- Supabase Auth, Postgres, and Realtime
- Poppins + IBM Plex Mono
- XcodeGen for the Xcode project

## Layout

```
Ours/
  Ours/           # Swift sources (views, store, services)
  Fonts/          # Bundled typefaces
  Ours.xcodeproj
  project.yml
```
