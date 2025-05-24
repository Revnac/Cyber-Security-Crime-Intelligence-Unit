# GuardianAI Platform

## Vision

To empower the South African Police Service (SAPS) Intelligence Unit, specifically operating from Randburg, Gauteng, South Africa, with a cutting-edge, ethically-driven, and legally compliant cybersecurity platform, 'Guardian AI.'

## Overview

GuardianAI is a cybersecurity and crime prevention platform being developed for the SAPS Intelligence Unit. This repository contains the source code for its backend services and frontend interface.

## Current Status - Phase 1 Completion

-   Phase 1 of development has established the foundational structure for the application.
-   A Python FastAPI backend is set up with mock API endpoints for various tools and integrations.
-   A React frontend provides a basic dashboard with components for displaying a crime map, crime trends, and an IP reputation checking tool (currently connected to mock backend responses).
-   Basic project documentation (how to run frontend and backend) is available in respective directories.

## Modules

### Backend

Located in the `/backend` directory, the backend is built using Python and FastAPI. It's designed to provide API endpoints for various cyber intelligence tools, integrations with external security platforms, and crime prediction capabilities.

For detailed information on setup, structure, and API endpoints, see [backend/README.md](./backend/README.md).

### Frontend

Located in the `/frontend` directory, the frontend is a React application built using Create React App. It provides a user interface for interacting with the GuardianAI platform, including a dashboard for visualizing crime data and accessing tools.

For detailed information on setup, structure, and connecting to the backend, see [frontend/README.md](./frontend/README.md).

## Proposed Next Steps (Phase 2 Development)

### Backend - Real Implementations

*   Incrementally replace mock API responses with actual logic.
*   **`CyberIntelligenceTool`**:
    *   Implement real calls to a malware analysis sandbox (handle file uploads and report retrieval).
    *   Integrate with the IPVoid API (or a similar service) for IP reputation checks, managing API keys securely.
    *   Develop PyShark functionality to analyze PCAP files (handle file uploads/processing and extract relevant information).
*   **`External Integrations`**:
    *   Implement actual API calls to Cisco Meraki, Microsoft Sentinel, and SAPS Intel APIs.
    *   Manage API keys and service configurations securely (e.g., via environment variables or a configuration service).
*   **`Prediction`**:
    *   Load actual crime data (e.g., from the existing `crime_data.csv` or a dedicated database).
    *   Refine the `RandomForestClassifier` model, implement proper training pipelines, and enable saving/loading of trained models.
    *   Design and implement proper data input mechanisms for making predictions (not just mock location strings).
*   Implement robust error handling and structured logging across the backend.
*   Integrate a database (e.g., PostgreSQL, MySQL, or a NoSQL DB like MongoDB) for persistent storage of:
    *   Crime data and trends.
    *   Case management information.
    *   User accounts and roles (if required).
    *   Audit logs.

### Frontend - UI/UX Enhancement & Feature Integration

*   **Advanced Interface Design:**
    *   Design and implement a more sophisticated, user-friendly, and professional dashboard layout.
    *   Evaluate and potentially integrate a UI component library (e.g., Material-UI, Ant Design, Chakra UI) for consistent styling and pre-built components.
*   **Real Data Display:**
    *   Connect all relevant frontend components to backend endpoints that serve real data, replacing mock data.
    *   Implement proper state management for handling asynchronous data (e.g., using React Query, SWR, or Redux Toolkit).
*   **Interactive Visualizations:**
    *   Enhance `CrimeMap.js` to be more interactive (e.g., clicking on crime markers to show detailed information, filtering by crime type or date).
    *   **Integrate `graph_3d.js`**:
        *   Clearly define its purpose (e.g., visualizing relationships between entities, network traffic patterns).
        *   Connect it to relevant data sources from the backend.
        *   Implement it as a proper React component using a library like `react-three-fiber` or `vis.js` (if 2D graph is more suitable).
    *   **Integrate `ip_mapper.js`**:
        *   Implement as a React component for plotting multiple IP address geolocations on a map.
        *   Utilize the Google Maps API via `@react-google-maps/api` effectively.
        *   Integrate with a real IP geolocation API via the backend.
*   **Tool Integration:**
    *   Fully integrate all functionalities of the `CyberIntelligenceTool` (malware analysis, network traffic analysis) into the UI, allowing file uploads and displaying results.
*   **Alerts & Notifications:**
    *   Design and implement a system for displaying real-time alerts and notifications from integrated systems (e.g., Meraki, Sentinel) within the dashboard.
*   Implement User Authentication and Authorization if required by SAPS, including login/logout functionality and role-based access control.

### API Security & Configuration

*   Implement secure API key management for external services (e.g., using environment variables, `.env` files loaded by Pydantic, or a dedicated configuration service like HashiCorp Vault).
*   Configure Cross-Origin Resource Sharing (CORS) in FastAPI appropriately to allow secure communication from the frontend domain.
*   Consider implementing API authentication (e.g., OAuth2/JWT) for backend endpoints if sensitive operations or user-specific data access is required.

### Testing

*   Develop unit tests for backend business logic (e.g., using `pytest`).
*   Create component tests for critical frontend UI elements (e.g., using React Testing Library and Jest).
*   Implement integration tests for API endpoints to ensure frontend and backend communicate correctly.

### DevOps & Deployment

*   **Containerization:** Create Dockerfiles for both the backend (FastAPI) and frontend (React) applications. Use Docker Compose for local development environment setup.
*   **CI/CD Pipeline:** Set up a Continuous Integration/Continuous Deployment pipeline (e.g., using GitHub Actions, GitLab CI, or Jenkins) for automated testing, building, and deployment.
*   **Deployment Strategy:** Define a deployment strategy for staging and production environments (e.g., deploying to a cloud provider like AWS, Azure, or Google Cloud, or an on-premise server).

---
This README provides a high-level overview. For more specific details, please refer to the README files within the `/backend` and `/frontend` directories.
