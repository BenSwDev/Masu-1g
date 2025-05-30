# Working Hours Management Feature

This document provides an overview of the Working Hours Management feature, including its components, server actions, and overall architecture.

## Overview

The Working Hours Management feature allows administrators to define standard weekly operating hours and set up special dates (like holidays or events) with custom hours or closures. It also supports price adjustments for specific days or special dates.

The feature is divided into two main sections:
1.  **Weekly Hours:** Manage the default opening and closing times for each day of the week.
2.  **Special Dates:** Define exceptions to the weekly schedule, such as holidays, special events, or temporary closures. These can have their own operating hours or be marked as closed, and can also include price adjustments.

## Component Structure

```mermaid
graph TD;
    A["app/dashboard/admin/working-hours/page.tsx"] --> B["WorkingHoursClient (components/.../working-hours-client.tsx)"];
    B --> C["Tabs (shadcn/ui)"];
    C --> D["WeeklyHoursSection (components/.../weekly-hours-section.tsx)"];
    C --> E["SpecialDatesSection (components/.../special-dates-section.tsx)"];
    D --> F["DayRow (Switch, Selects for time, Price Adjustment Form)"];
    E --> G["Button (Add New Special Date)"];
    E --> H["Calendar (shadcn/ui, for filtering)"];
    E --> I["SpecialDateCard (Displays date info, Dropdown for actions)"];
    I --> J["SpecialDateForm (components/.../special-date-form.tsx) (Used for Add/Edit Modally/In-place)"];
    G --> J;
