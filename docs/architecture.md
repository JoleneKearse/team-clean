# Team Clean Architecture

## Purpose

Team Clean is a React + TypeScript scheduling application used to manage weekly cleaning assignments, staffing changes, and building coverage. The scheduling rules reflect real operational needs and should not be simplified without explicit approval.

This document explains the core scheduling assumptions so future development work preserves the expected behavior.

---

## Core Scheduling Principles

- The app is built around a **Monday-to-Friday work week**.
- **Weekends are not part of the normal rotation cycle**.
- **Holidays are also excluded from rotation advancement**.
- Rotation should advance only on valid working days.
- The system must preserve fairness across cleaners over time.

A fixed reference date is used to keep the rotation stable and predictable:

- `ANCHOR_MONDAY = 2026-02-23`

This anchor Monday is the baseline for determining how many valid workdays or workweeks have passed when generating schedules. It must remain constant unless there is an intentional migration of the rotation system.

---

## Rotation Logic

### Goal

Rotation logic exists to distribute assignments fairly across the team while keeping the weekly schedule predictable.

### Rules

- Rotation is based on a Monday anchor date: `2026-02-23`
- Only working days should affect rotation progression.
- Saturdays and Sundays must be ignored.
- Holidays must also be ignored.
- A holiday should behave like a skipped workday, not like a completed rotation day.
- The next valid workday continues from the prior valid day’s rotation state.

### Important behavior

When calculating a schedule for a target date:

1. Start from `ANCHOR_MONDAY`.
2. Count forward using only valid working days.
3. Skip all weekends.
4. Skip all holidays.
5. Use the resulting offset to determine assignment order.

### Guardrail

Do not replace this with naive date-difference logic. A simple calendar-day difference will break fairness because weekends and holidays must not advance the rotation.

---

## Float Role Handling and Necessary Roles

### Role names used in the app

Float roles are explicitly represented in the app and code as:

- `Flo1`
- `Flo2`
- `Flo3`

These are not interchangeable labels. They follow a fallback order:

- `Flo3` -> `Flo2` -> `Flo1`

This order matters when staffing is reduced and reassignments are made.

### Necessary jobs

The following jobs are treated as necessary jobs:

- `Bath`
- `SW`
- `Vac`
- `San`
- `Gar`

Necessary jobs must be preserved as staffing decreases until later reduction thresholds make that impossible.

### Default staffing

The default staffing level is **8 cleaners**.

At full staffing, float roles can include `Flo1`, `Flo2`, and `Flo3`.

### Staffing reduction rules

#### Staffing reduced from 8 to 7

When **1 cleaner calls off** and staffing is reduced to **7**:

- There is **no `Flo3`**.
- If the call-off is `Flo3`, **no reassignments are made**.
- If the call-off is `Flo2`, `Flo3` becomes `Flo2`.
- If the call-off is `Flo1`, `Flo3` becomes `Flo1`.
- If the call-off is a necessary job (`Bath`, `SW`, `Vac`, `San`, `Gar`), `Flo3` becomes that job.

#### Staffing reduced from 8 to 6

When **2 cleaners call off** and staffing is reduced to **6**:

- There is **no `Flo3`**.
- There is **no `Flo2`**.
- Only the remaining coverage pattern for 6 staff should be used.

#### Staffing reduced from 8 to 5

When **3 cleaners call off** and staffing is reduced to **5**:

- There are **no float jobs**.
- `Flo1`, `Flo2`, and `Flo3` are all removed from coverage.

#### Staffing reduced from 8 to 4

When **4 cleaners call off** and staffing is reduced to **4**:

- There are **no float jobs**.
- There is **no `Vac`**.

#### Staffing reduced from 8 to 3

When **5 cleaners call off** and staffing is reduced to **3**:

- There are **no float jobs**.
- There is **no `Vac`**.
- There is **no `Gar`**.

### Guardrails

- Do not treat float roles as generic extras.
- Do not remove the fallback order between `Flo3`, `Flo2`, and `Flo1`.
- Do not assume all float roles disappear at the same staffing threshold.
- Do not treat necessary jobs and float jobs as equivalent during reassignment.
- Do not change staffing reduction behavior without explicitly updating this document and the scheduling rules.

---

## Building-Specific Assignment Rules

This section defines how cleaners are distributed across buildings and how assignments change depending on staffing levels, seasonal conditions, and special circumstances.

These rules reflect operational practice and must not be simplified into generic distribution logic.

---

## Normal Building Set

Typical buildings included in the schedule:

- Seniors
- Fieldhouse
- Education
- Grade 2
- Social
- Grade 1
- Annex
- Daycare
- Band Office
- Health Center

### Seasonal Buildings

During the summer:

- Drop In Center may be added
- Its schedule is determined manually each year

### Environmental Closures

During benzene leaks or other pollution events affecting Band zones:

Assignments may temporarily shift to:

- Community Center
- Church

These substitutions are situational and should remain configurable rather than hardcoded.

---

## Seniors, Fieldhouse, and Education

Normally:

- Seniors and Fieldhouse together receive **3 assigned cleaners** when staffing is 8

Conditional rule:

If the classroom is confirmed closed (rare):

- Education joins Seniors and Fieldhouse
- The same 3 cleaners cover all three

Otherwise:

- All cleaners proceed to Education

---

## Grade 2, Social, Grade 1, and Annex

Assignment relationships:

- Cleaners assigned to **Grade 2** also complete **Social**
- Three cleaners are initially assigned to this area
- `Flo1` may instead be reassigned to **Grade 1** depending on staffing needs

Additional linkage:

- Cleaners assigned to **Grade 1** also complete **Annex**

These paired-building relationships must be preserved.

---

## Daycare Assignment Rules

Daycare differs from other buildings because each cleaner is responsible for a specific room or zone.

Primary areas:

- Bathrooms
- Baby Room
- Toddler Room
- P1 and playground doorway
- P2
- Kindergarten
- Outside (front and back when staffing allows)

### Staffing = 8

Assignments:

- `Bath` → Bathrooms
- `Flo1` → Baby Room & Kindergarten lockers
- `SW` → P2
- `Flo2` → Toddler Room & P2 lockers
- `Vac` → P1 & playground doorway
- `San` → Kindergarten
- `Flo3` → Back outside & P1 lockers
- `Gar` → Fill & front outside

### Staffing = 7

Assignments:

- `Bath` → Bathrooms
- `Flo1` → Baby & Toddler
- `SW` → P2
- `Flo2` → Back outside
- `Vac` → P1 & playground doorway
- `San` → Kindergarten
- `Gar` → Fill & front outside

### Staffing = 6

Assignments:

- `Bath` → Bathrooms
- `Flo1` → Baby & Toddler
- `SW` → P2
- `Vac` → P1 & playground doorway
- `San` → Kindergarten
- `Gar` → Fill & all outside

### Staffing = 5

Behavior:

- Baby and Toddler rooms are split among available cleaners

### Staffing = 4

Behavior:

- Baby and Toddler rooms are split
- Bathrooms are also split

---

## Band Office Rules

When staffing is reduced:

### Staffing = 5

- Cleaners complete assignments on both floors

### Staffing = 4

- No vacuuming

### Staffing < 4

- Cleaners complete as much coverage as possible

Role-based expectations:

- `Flo1` cleans Chambers (if used) or completes basement work
- `Flo2` (if present) goes directly to the basement
- `Flo3` (if present) completes basement bathrooms

---

## Health Center Rules

Role responsibilities:

- `Flo1` → Medical rooms
- `Flo2` → Big room
- `Flo3` → Chooses a wing and completes all work there

Conditional rule:

If staffing = 6:

- `Vac` also completes the Big room

If staffing = 4:

- `Vac` is removed

---

## Global Low-Staffing Priority Rule

Across all buildings:

If staffing drops to **4 or below**:

Priority should be given to maintaining coverage for the three largest jobs:

- `SW`
- `San`
- `Bath`

Remaining staff should complete as much additional work as possible based on time and feasibility.

These priorities reflect real operational expectations rather than optional scheduling preferences.

---

## Building Component Order

### Goal

The building display order is part of how the team reads the schedule. It is intentionally different on Friday.

### Monday to Thursday

From Monday through Thursday, building components should render in the normal weekday order:

1. Buildings
2. Daycare
3. Band Office
4. Health Center

### Friday

Friday, or Thursdays if a holiday falls on Friday, uses a different building component order:

1. Seniors
2. Grade 1
3. Grade 2
4. Daycare
5. Education
6. Fieldhouse
7. Social
8. Annex
9. Band Office
10. Health Center

### Guardrail

Do not assume the component order is the same across all weekdays. Friday is intentionally different and must be handled explicitly.

---

## Holiday Handling

Holiday behavior should be explicit in scheduling logic.

### Rules

- Holidays should not advance rotation.
- Holidays should not be treated like weekends in UI wording unless that is a deliberate product decision.
- Holiday closures may affect which buildings or assignments are shown.
- Closed items should remain compatible with the app’s existing daily data shape.

If the app stores closures by day, those closures should work with scheduling logic rather than bypassing it.

---

## Data and Logic Preservation Notes

When modifying this project:

- Preserve the meaning of `ANCHOR_MONDAY = 2026-02-23`
- Preserve weekend-skipping behavior
- Preserve holiday-skipping behavior
- Preserve the distinction between necessary roles and float roles
- Preserve staffing-sensitive building assignment behavior
- Preserve the different Friday component order

These are business rules, not implementation accidents.

---

## Implementation Notes for Future Development

When adding or refactoring code:

- Prefer explicit utility functions for schedule calculations.
- Keep date-based rotation logic separate from UI rendering where possible.
- Keep holiday logic centralized.
- Avoid hidden assumptions that every day follows the same building order.
- Avoid “cleanup” refactors that flatten the difference between required and float roles.

---

## Next Documentation Improvements

This file should eventually be expanded with:

- holiday source-of-truth rules
