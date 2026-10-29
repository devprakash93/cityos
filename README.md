🏙️ ODISHA CityOS

One City. One Platform. Smarter Services.

A Unified Digital City Operating System for Odisha

Odisha CityOS is a civic technology platform designed to connect citizens, city-service departments, field workers and emergency-response controllers through a unified digital ecosystem. The platform aims to simplify civic issue reporting, improve service coordination, support emergency response workflows and provide a centralized view of city operations.

«Project status: Academic and development project. Features that depend on live government data, external APIs, GPS feeds, telephony or emergency-service integrations require separate configuration and verification.»

---

📌 Table of Contents

- "Overview" (#-overview)
- "Problem Statement" (#-problem-statement)
- "Objectives" (#-objectives)
- "Key Features" (#-key-features)
- "User Roles" (#-user-roles)
- "City Services" (#-city-services)
- "Emergency Response System" (#-emergency-response-system)
- "System Architecture" (#-system-architecture)
- "Technology Stack" (#-technology-stack)
- "Project Structure" (#-project-structure)
- "Getting Started" (#-getting-started)
- "Environment Configuration" (#-environment-configuration)
- "API Documentation" (#-api-documentation)
- "Security and Privacy" (#-security-and-privacy)
- "Testing" (#-testing)
- "Deployment" (#-deployment)
- "Future Enhancements" (#-future-enhancements)
- "Contributing" (#-contributing)
- "Disclaimer" (#-disclaimer)
- "License" (#-license)

---

🌐 Overview

Traditional civic-service workflows can involve disconnected departments, fragmented complaint channels and limited visibility into service-request progress.

Odisha CityOS proposes a unified platform where citizens can report civic issues, authorized officials can coordinate service delivery, field workers can update assigned tasks, and emergency controllers can manage incoming emergency requests.

The system is designed around role-based access, shared data, geographic context and transparent status tracking.

Vision

To build a smarter, more connected and citizen-centric digital ecosystem for Odisha.

Mission

- Simplify access to civic services.
- Improve coordination between departments and field teams.
- Make complaint status and resolution progress easier to track.
- Support location-aware service management.
- Provide a dedicated emergency coordination workflow.
- Explore responsible AI applications for civic operations.

---

🎯 Problem Statement

Citizens may face difficulties identifying the correct department for a civic issue, tracking complaint progress and receiving timely updates. City-service teams may also need better tools to organize records, coordinate field work and understand where issues are concentrated.

Odisha CityOS addresses these challenges through a unified, role-based platform that brings civic reporting, service administration, complaint workflows and emergency coordination into one application.

---

🎯 Objectives

1. Build a centralized interface for civic services.
2. Enable citizens to submit and track complaints.
3. Provide administrators with service-specific management modules.
4. Connect complaints with authorized departments and field workers.
5. Support geographic visualization of relevant service records.
6. Provide a dedicated Emergency Controller role and dashboard.
7. Deliver official announcements through a centrally managed publishing workflow.
8. Explore AI-assisted classification, duplicate detection and information retrieval.
9. Maintain appropriate authentication, authorization, auditability and data privacy.

---

✨ Key Features

👥 Citizen Portal

- Citizen-facing homepage with quick service actions.
- Civic complaint submission and tracking.
- Complaint status timeline and reference IDs.
- Location detection through the browser Geolocation API, subject to permission.
- Access to eligible official announcements and public-service information.
- Responsive interface for mobile and desktop.
- Optional cinematic intro animation for the public-facing website.

🛡️ Admin Command Center

- Centralized administrative dashboard.
- City Services navigation.
- Complaint and service-record oversight.
- Geographic filtering where supported.
- Map-based visualization of records with valid coordinates.
- Administrative record management according to permissions.
- Official announcement management, if enabled.
- Operational summaries and audit visibility where implemented.

🧰 Field Worker Portal

- View assigned tasks.
- Access task details and relevant locations.
- Update work progress.
- Upload completion evidence where supported.
- Submit completed work for verification.

🏢 Department Officer Portal

- Review department-related complaints.
- Assign work to authorized field workers.
- Monitor assignment progress.
- Verify submitted completion evidence.
- Review service performance within the officer's authorized scope.

🚨 Emergency Controller

- Dedicated Controller role and authentication.
- Emergency-focused dashboard.
- Incoming emergency records.
- Emergency status summaries and filters.
- Citizen-reported location visualization.
- Emergency acknowledgement and dispatch workflow.
- Status updates and response history.
- Simulated calling interface for demonstrations, if implemented.

📢 Official Updates

- Featured announcements and public notices.
- Civic awareness campaigns.
- Public-service updates.
- Department-specific notices.
- Publication scheduling and expiry, if implemented.
- Admin-managed publishing controls.

---

🏙️ City Services

The Admin Dashboard includes six City Services modules.

Module| Purpose
Traffic Management| Manage traffic records, incidents and congestion information where available.
Waste Management| Manage waste-bin records and supported collection information.
Water Management| Manage water infrastructure, service interruptions and supported monitoring records.
Electricity Management| Manage electricity-related infrastructure, faults and maintenance records.
Public Transport| Manage bus, route, stop and transport-service records.
Pollution & AQI| Manage pollution monitoring records and supported air-quality measurements.

Each module should use its own appropriate data model, API mapping and permissions.

Data integrity matters: A page heading alone does not guarantee that the correct data is displayed. For example, electricity records should not display waste-bin fields, and Pollution & AQI should not display bus-related fields.

Live monitoring, sensor readings and vehicle tracking require actual connected data sources.

---

👤 User Roles

Odisha CityOS uses a role-based access model.

Role| Responsibilities
Citizen| Submit and track complaints, access public information and request emergency assistance.
Admin| Manage authorized City Services records, oversee operations and manage platform features within assigned permissions.
Department Officer| Review complaints, coordinate department work and verify task completion.
Field Worker| Complete assigned tasks, update progress and submit evidence.
Emergency Controller| Receive, acknowledge and coordinate emergency requests through a dedicated control interface.
Super Admin| Manage high-level system configuration and permissions where supported.

Role-based authorization

- Each role should have a defined set of permissions.
- Protected operations must be validated by the backend.
- Frontend route guards should complement, not replace, backend authorization.
- The Emergency Controller role should remain separate from unrestricted administrative access.
- Controller credentials must not be exposed in frontend code.

---

🚨 Emergency Response System

The Emergency System is designed to coordinate emergency requests through a citizen interface and a dedicated Emergency Controller dashboard.

Workflow

1. The citizen opens the Emergency interface.
2. The citizen selects an emergency type.
3. The browser requests location permission when location detection is needed.
4. The citizen submits an emergency request.
5. The backend validates and stores the request with a unique identifier.
6. The controller dashboard receives or retrieves the new request.
7. An authorized controller acknowledges the incident.
8. The controller records dispatch or response-team assignment when applicable.
9. The citizen receives status updates through the configured notification mechanism.
10. An authorized user records the resolution.

Example status lifecycle

"NEW → ACKNOWLEDGED → DISPATCHED / RESPONDING → RESOLVED"

The exact statuses must match the backend implementation.

Location handling

The application can use the browser Geolocation API to obtain coordinates after the citizen grants permission. Location accuracy and availability depend on the device and browser.

The system should not fabricate coordinates or claim that a location is live when it is actually demonstration data.

Demo calling

A simulated call may demonstrate calling, connected and ended states between the citizen and controller interfaces.

A simulated call does not automatically provide real audio or contact emergency services. Real calling requires a separate WebRTC or telephony integration.

Safety note: A development demo is not a substitute for official emergency-response services.

---

🧠 AI and LLM Opportunities

The following capabilities are potential extensions, subject to implementation and testing.

Capability| Application
Complaint classification| Suggest complaint category and responsible department.
Multilingual understanding| Process supported Odia, English and Hinglish complaint descriptions.
Semantic duplicate detection| Identify potentially similar complaints.
RAG assistant| Answer civic-service questions using approved documents.
Officer copilot| Summarize authorized complaint records and their history.
Natural-language analytics| Answer operational questions through controlled backend functions.
Report generation| Draft service summaries from verified records.

AI-generated suggestions should remain reviewable by authorized users. Access to records must be enforced by the backend, and the AI must not be allowed to execute arbitrary database queries.

---

🏗️ System Architecture

The following is the intended high-level architecture; verify it against the actual repository before treating every component as implemented.

                    CITIZEN PORTAL
                           |
             ADMIN / OFFICER / WORKER
                           |
                  EMERGENCY CONTROLLER
                           |
                           v
                  REACT FRONTEND
                           |
                           v
                      django API
                           |
              +------------+------------+
              |            |            |
              v            v            v
        Authentication   Workflows    Services
              |            |            |
              +------------+------------+
                           |
                           v
                       MONGODB
                           |
                +----------+----------+
                |                     |
                v                     v
        Real-time Events        Optional AI Service
        (e.g. Socket.IO)        (LLM / RAG / NLP)

Main components

- Frontend: User interfaces and interaction.
- Backend: Authentication, permissions, validation and business logic.
- Database: Persistent application records.
- Real-time layer: Emergency notifications and status events where configured.
- Maps and geolocation: Geographic display and citizen-provided location.
- AI services: Optional language and retrieval capabilities.

---

💻 Technology Stack

The following stack has been discussed for the project. Confirm the actual versions and dependencies in your repository.

Layer| Technology
Frontend| React.js
Build tool| Vite
Styling| Tailwind CSS
Backend| python django
Database| MongoDB
Real-time communication| Socket.IO, if configured
Maps| Existing map provider or mapping library
Location| Browser Geolocation API
AI/LLM| Optional LLM, embeddings and RAG services
Frontend deployment| Vercel
Backend deployment| cloudflare
Version control| Git and GitHub

---



---

⚙️ Getting Started

Prerequisites

Install the following tools as required by your existing project:

- Node.js and npm.
- MongoDB local installation or a configured MongoDB deployment.
- Git.
- A code editor such as Visual Studio Code.

1. Clone the repository

git clone <YOUR_GITHUB_REPOSITORY_URL>
cd odisha-cityos

Replace the placeholder with your actual repository URL.

2. Install frontend dependencies

cd frontend
npm install

3. Install backend dependencies

Open another terminal:

cd backend
npm install

4. Configure environment variables

Create local ".env" files based on the environment variables required by the existing frontend and backend.

Example placeholders are provided below. Your actual variable names may differ.

Backend ".env" example:

PORT=5000
MONGODB_URI=your_mongodb_connection_string
SESSION_SECRET=replace_with_a_strong_random_secret
FRONTEND_URL=http://localhost:5173

Frontend ".env" example:

VITE_API_BASE_URL=http://localhost:5000/api

Never commit real credentials, database passwords, API keys or production secrets to GitHub.

5. Run the application

Use the scripts defined in each "package.json". For example, if the project defines the usual development scripts:

# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev

Open the local frontend URL printed by Vite.

Note: These commands and environment variables are examples. Follow your repository's actual scripts and configuration, and do not replace working settings blindly.

---

🔌 API Documentation

API endpoints should be documented with:

- HTTP method and path.
- Request body and query parameters.
- Response schema and example.
- Authentication requirements.
- Required role and permissions.
- Validation and error responses.

Suggested documentation file:

"docs/API_ENDPOINTS.md"

A proposed endpoint contract should not be treated as an implemented endpoint until it has been verified against the backend code and tested.

---

🔐 Security and Privacy

Security is essential because the application may process location information, citizen complaints and emergency records.

- Enforce backend authentication and authorization.
- Store passwords securely and never expose secrets in frontend bundles.
- Use HTTPS in deployed environments.
- Request location permission transparently.
- Restrict access to sensitive citizen and emergency information.
- Validate incoming requests and uploaded files.
- Apply appropriate rate limits to sensitive endpoints.
- Maintain audit records for important administrative and emergency actions.
- Keep demo data and simulated calls clearly labelled.
- Avoid exposing private information in application logs.

---

🧪 Testing

Before a release, verify:

- Authentication and role-based access.
- Citizen complaint submission and tracking.
- Admin City Services data mapping and record management.
- Correct data fields for each service module.
- Emergency request creation and controller notifications.
- Location permission and failure handling.
- Emergency acknowledgement, dispatch and resolution.
- Demo-call state transitions.
- API validation and error handling.
- Mobile responsiveness and accessibility.
- Environment configuration and deployment.

Use automated tests where practical, especially for authentication, permissions and emergency status transitions.

---

🚀 Deployment

The proposed deployment arrangement is:

- Frontend: Vercel.
- Backend: Render.
- Database: Configured MongoDB deployment.
- Optional AI service: Separate deployment only if required.

Before deployment:

1. Configure production environment variables.
2. Restrict database access.
3. Configure CORS for approved frontend origins.
4. Enable HTTPS.
5. Verify session/cookie or token security.
6. Test production API connectivity.
7. Confirm that no demo credentials or secrets are exposed.
8. Verify that live integrations are accurately represented in the UI.

---

🔮 Future Enhancements

Potential future improvements include:

- Odia-first and multilingual accessibility.
- Semantic complaint matching.
- AI-assisted department assignment.
- RAG-based civic information assistant.
- Live traffic and public transport feeds.
- Verified sensor integrations for water, electricity and air quality.
- Advanced geographic analytics.
- Response-time and service-level reporting.
- Real-time emergency notifications.
- Authorized telephony or audio-call integration.
- Public-service campaign analytics.

These are planned or optional enhancements until implemented and verified.

---

🤝 Contributing

Contributions from teammates are welcome.

1. Discuss the feature or issue before making major changes.
2. Create a separate branch for your work.
3. Follow the existing project conventions.
4. Avoid modifying unrelated modules.
5. Document API and database changes.
6. Test role permissions and affected workflows.
7. Open a pull request with a clear summary and testing notes.

Suggested branch naming:

feature/citizen-complaints
feature/emergency-controller
feature/city-services
fix/service-data-mapping
docs/api-reference

Coordinate shared API contracts and database changes before integrating parallel work.

---

⚠️ Disclaimer

Odisha CityOS is an academic and development project intended to explore digital civic-service management and city operations.

Unless explicitly integrated and verified, the application does not represent an official government platform and should not be assumed to connect to real government databases, live monitoring infrastructure or emergency-response services.

Simulated emergencies, sample records and demo calls must be clearly distinguished from real operational events.

---

📄 License

No license has been specified yet.

Before making the repository publicly reusable, select an appropriate license and add a "LICENSE" file. Do not claim an open-source license until it has been chosen.

---

<p align="center">ODISHA CityOS

Connecting Citizens, Services & Communities.

One City. One Platform. Smarter Services.

</p>
