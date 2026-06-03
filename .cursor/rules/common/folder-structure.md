# Folder Structure Rules – Lomtech BRDs Project

This document defines the **intent, ownership, and boundaries** of each top-level folder.
Cursor must treat this document as **source of truth** when reasoning about the project.

---

## *-fe (Frontend Folder)

### Purpose
This folder contains **all frontend-related assets and logic** for a specific BRD project.

### What Belongs Here
- UI code
- Frontend frameworks and libraries
- Client-side state management
- Frontend-specific configuration files

### What Muse GO Here
- Use App Router
- Mark Client Components with 'use client'
- Optimize images with next/image
- Hook has to be testable


### What Must NOT Go Here
- Backend logic
- Database schemas
- Business rules that belong to the server

### Mental Model
This folder represents **everything the user sees and interacts with**.

---

## *-be (Backend Folder)

### Purpose
This folder contains **all backend-related logic and infrastructure** for a specific BRD project.

### What Belongs Here
- APIs and services
- Business logic
- Database models and migrations
- Backend configuration and integrations

### What Must NOT Go Here
- UI components
- Frontend build tools
- Presentation-layer logic

### Mental Model
This folder represents **how the system thinks, decides, and enforces rules**.

---

## Global Rules for Cursor

- Never move files between `*-fe` and `*-be` without explicit instruction
- Never introduce cross-dependencies that blur frontend and backend responsibilities
- When unsure where something belongs, ask a clarifying question instead of guessing
- Respect folder intent over convenience

---

## Summary

- `*-fe` → user-facing logic and presentation
- `*-be` → system logic, data, and enforcement

This structure exists to preserve **clarity, ownership, and long-term maintainability**.
