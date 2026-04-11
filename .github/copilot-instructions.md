# Copilot Instructions for Team Clean

## Project Overview

Team Clean is a React + TypeScript scheduling application used in production
by a cleaning team to manage weekly job rotations and daily staffing changes.

Scheduling logic reflects real-world constraints and must not be simplified
without explicit user approval.

## Architecture Reference

The scheduling logic for this project is documented in:

docs/architecture.md

Follow the building assignment rules, float-role fallback order,
rotation anchor date, and staffing reduction behavior described there.

Do not simplify or replace these rules unless explicitly instructed.

## Critical Rules

- Do not refactor rotation logic unless requested.
- Do not change cleaner assignment order.
- Do not rename cleaner initials.
- Do not modify scheduling fairness logic.
- Do not remove swap tracking structures.
- Do not restructure Firestore document shape.

## UI Expectations

- CalendarWeekly is the primary schedule display.
- "Who is in today" controls staffing logic.
- Staffing count directly affects assignment distribution.
- UI must remain mobile-friendly.
- All components (except buttons) must be the same width.
- Preserve component order when sections are deferred by time-based visibility.
- If deferred sections render below SignOffMessage, keep their relative order as continuation of the same day order.
- Thursday-before-Friday-holiday uses Friday order only when the FRIDAY-IZE IT toggle is enabled.

## Data Model Constraints

Firestore documents use date-string keys like:

YYYY-MM-DD

Nested objects include:

presentCleanersByDay
swapOperationsByDay
closedItemsByDay

Do not flatten or normalize this structure.

## Coding Preferences

- Use TypeScript strict typing
- Prefer small utility helpers over inline logic
- Keep scheduling utilities in scheduleUtils.ts
- Avoid introducing new libraries unless requested
