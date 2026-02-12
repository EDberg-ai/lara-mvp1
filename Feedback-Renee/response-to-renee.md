# Response to Renee's Feedback - LARA v2.1

Thank you for the detailed and thoughtful feedback across all 24 slides. Below are answers to your key questions, followed by a summary of changes implemented.

---

## 1. Hosting and Domain

**Recommendation:** Netlify (frontend) + Railway (backend) for the pilot phase.

- **Why:** Both platforms offer simple deployment, built-in HTTPS, and are well-suited for pilot-scale usage. Railway provides managed PostgreSQL and Redis out of the box.
- **Custom domain:** We can set up a custom domain (e.g., `lara.edberg-edu.com`) once you're ready. This is a straightforward DNS configuration that can be done in under an hour.
- **Scaling:** If the pilot grows beyond a single class, both platforms scale smoothly without needing to re-architect.

## 2. Payment and Timeline

Understood and agreed. The priority order is:

1. Implement all feedback changes (this document confirms they are done)
2. Pilot LARA in one class
3. Payment discussion after successful pilot

We will flag any urgent cost items (e.g., AI API usage) if they arise during the pilot.

## 3. Student Access Window

- **Live session:** Students interact via Redis-backed sessions with a **16-hour TTL**. This covers a full school day plus buffer.
- **Persistent data:** Once feedback is generated and approved, all data (submission text, AI feedback, timestamps) is persisted to **PostgreSQL** (permanent storage).
- **Shareable link:** Students receive a shareable link after submitting their work. This link works indefinitely (as long as the system is running) because it retrieves data from PostgreSQL, not Redis.
- **Pilot configuration:** Data retention can be configured per your school's data policy. By default, data is retained until explicitly deleted.

## 4. Security and Privacy

LARA is designed with student privacy as a core principle:

- **No real names required:** Students join using a teacher-provided code (e.g., "9A01"). First-name-only usage is supported and recommended.
- **Data stored:** Student code, submission text, AI-generated feedback, timestamps. No personal identifiable information beyond what the teacher enters.
- **Encryption:** All data is encrypted in transit (HTTPS/TLS) and at rest (Railway PostgreSQL with encrypted volumes).
- **No third-party tracking:** No analytics cookies, no advertising, no data sharing.
- **AI processing:** Student work is sent to Anthropic's Claude API for feedback generation. Anthropic does not use API inputs for training. Data is processed and not retained by the AI provider.

---

## Changes Implemented

All P1 (critical path) and P2 (polish) changes from your feedback have been implemented. See the implementation plan for the full list of changes across 15+ files.

---

*LARA v2.1 | EDberg Education*
