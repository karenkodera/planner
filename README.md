# Ours

A warm, personal couples calendar for coordinating life one week at a time.

**Ours** is an Expo (React Native) iPhone app prototype. Your schedule is the primary layer, your partner’s sits softly underneath, and shared plans glow as a distinct third type. The first version uses rich mock data so the visual and interaction design can come first — no accounts, backends, or real calendar sync yet.

## Features

- **Week-at-a-time calendar** with day strip + layered day timeline
- **Three event layers**: yours, partner (Alex), together
- **Create individual plans** or **send shared requests**
- **Accept / suggest a different time / decline** on incoming requests
- **Voice quick-add** with mock speech recognition + natural language parsing
- **Find Time Together** — intersects both calendars and offers mutual free windows

## Run it

```bash
npm install
npx expo start
```

Then open on:

- **iPhone** — Expo Go (scan the QR code)
- **Web preview** — press `w` in the terminal (handy on Windows)
- **Android emulator** — press `a`

> Native iOS builds still need a Mac / EAS. Expo Go is enough for this prototype.

## Stack

- Expo SDK 57 · React Native · TypeScript
- Fraunces + DM Sans
- date-fns for week math and free-slot finding

## Project layout

```
src/
  components/   # calendar UI, sheets, atmosphere
  data/         # mock couple, events, requests
  screens/      # home week experience
  store/        # calendar context + actions
  theme/        # color + type
  types/
  utils/        # dates, find-time, voice parse
```
