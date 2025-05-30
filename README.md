# Guardian AI - SAPS Intelligence Unit Cybersecurity & Crime Analytics Platform

This repository contains the components for the Guardian AI platform, a system designed to support the South African Police Service (SAPS) Intelligence Unit with advanced cybersecurity and crime analytics capabilities.

## Project Vision

To empower the South African Police Service (SAPS) Intelligence Unit, specifically operating from Randburg, Gauteng, South Africa, with a cutting-edge, ethically-driven, and legally compliant cybersecurity platform, 'Guardian AI.'

## Core Philosophy

Proactive defense, real-time actionable intelligence, ethical operation, strict legal and regulatory compliance, and continuous adaptation to the evolving threat and criminal landscape in South Africa.

## Project Structure

The project is organized into several key components:

-   **`guardian_ai_plan.py`**: A Python script outlining the detailed strategic plan, service pillars, technology stack, implementation timeline, and KPIs for the Guardian AI platform.
-   **`integrations/`**: Contains scripts for integrating with external systems and services.
    -   `sentinel_meraki_integration.py`: Python script for fetching security events from Cisco Meraki and sending them to Microsoft Sentinel and a SAPS Intelligence API.
-   **`cyber_intel_tool/`**: Python-based command-line tool for various cyber intelligence tasks.
    -   `tool.py`: Implements functionalities like malware analysis (via sandbox), IP reputation checking, and network traffic analysis (PCAP files using PyShark).
-   **`visualization/`**: JavaScript modules for data visualization.
    -   `graph_3d.js`: Script to render a 3D scatter plot using THREE.js. Requires an HTML canvas with `id='canvas'`.
    -   `ip_geolocator.js`: Script to plot IP address geolocations on Google Maps. Requires the Google Maps API and an HTML element with `id='map'`.
-   **`web_dashboard/`**: A web application for displaying crime analytics and intelligence data.
    -   **`frontend/`**: React-based user interface.
        -   `src/components/CrimeMap.js`: Displays crime incidents on a Google Map.
        -   `src/components/CrimeChart.js`: Displays crime trends using Recharts.
        -   `src/components/mitre/SecurityEventList.js`: Displays a list of security events from various sources, including ingested alerts from Microsoft Sentinel (identifiable by `eventSource: 'Microsoft-Sentinel-alert'` or `'Microsoft-Sentinel-incident'`). Includes filtering by MITRE ATT&CK IDs, severity, source, etc.
        -   `src/App.js`: Main React application component.
        -   `package.json`: Frontend dependencies and scripts.
    -   **`backend/`**: Node.js (Express) application providing APIs for the frontend.
        -   `models/crime.js`: Mongoose schema for crime data.
        -   `routes/crime.js`: API routes for crime data CRUD operations and trends.
        -   `app.js`: Main Express application setup.
        -   `package.json`: Backend dependencies and scripts.
-   **`prediction_service/`**: Python scripts for crime prediction modeling.
    -   `crime_prediction.py`: Script for training a crime prediction model using `scikit-learn`. Requires `crime_data.csv`.

## Setup and Running Components

Detailed setup instructions for each component are provided below. Ensure all API keys and sensitive configurations are stored securely, preferably using environment variables or a configuration management system, not hardcoded directly in scripts for production use.

### 1. Guardian AI Plan Script (`guardian_ai_plan.py`)
-   **Purpose**: Defines and prints the strategic plan for the Guardian AI platform.
-   **Language**: Python 3
-   **Running**: `python guardian_ai_plan.py`
-   **Dependencies**: None (standard Python libraries).

### 2. Integrations (`integrations/sentinel_meraki_integration.py`)
-   **Purpose**: Integrates Cisco Meraki security events with Microsoft Sentinel and SAPS Intel API.
-   **Language**: Python 3
-   **Dependencies**: `requests`
    -   Install: `pip install requests`
-   **Configuration**: Update placeholder API keys and endpoint URLs within the script:
    -   `sentinel_workspace_id`, `sentinel_workspace_key`, `sentinel_log_type`
    -   `meraki_api_key`, `meraki_org_id`
    -   `saps_intel_api_url`, `saps_intel_api_key`
-   **Running**: `python integrations/sentinel_meraki_integration.py`

### 3. Cyber Intelligence Tool (`cyber_intel_tool/tool.py`)
-   **Purpose**: CLI tool for malware analysis, IP reputation, and network traffic analysis.
-   **Language**: Python 3
-   **Dependencies**: `requests`, `pyshark` (which requires `tshark` to be installed on the system).
    -   Install: `pip install requests pyshark`
    -   Ensure `tshark` (part of Wireshark) is installed and in your system's PATH.
-   **Configuration**: Update placeholder API URLs/keys in `tool.py`:
    -   `self.sandbox_url`, `self.sandbox_results_url_template`
    -   `self.ipvoid_api_url` (ensure it includes your IPVoid API key)
-   **Running**: `python cyber_intel_tool/tool.py` (interactive menu)

### 4. Visualization Scripts (`visualization/`)
-   **Purpose**: JavaScript modules for embedding visualizations in HTML.
-   **`graph_3d.js`**:
    -   **Dependency**: THREE.js. Include this library in your HTML file.
    -   **HTML Requirement**: A `<canvas id='canvas'></canvas>` element.
-   **`ip_geolocator.js`**:
    -   **Functionality**: Provides a `getGeolocation(ipAddress, token)` function that calls a backend proxy endpoint (`/api/util/ip-geolocation/:ipAddress`) to fetch geolocation data for an IP address. The backend proxy handles the actual external API call and API key management.
    -   **Authentication**: The calling frontend component must provide a valid JWT authentication token to `getGeolocation`.
    -   **Note**: The `plotLocations` function in this script (if used) would also need to be adapted to receive and pass this token when calling `getGeolocation`. It also requires the Google Maps API for map rendering.
-   **Usage**: Include these scripts in an HTML file that provides the required canvas/div elements and library dependencies.

### 5. Web Dashboard (`web_dashboard/`)

#### Frontend (React App - `web_dashboard/frontend/`)
-   **Purpose**: User interface for displaying crime maps and charts.
-   **Dependencies**: `react`, `react-dom`, `react-scripts`, `@react-google-maps/api`, `recharts` (see `package.json`).
-   **Configuration**:
    -   Google Maps API Key: In `src/components/CrimeMap.js`, replace `'YOUR_GOOGLE_MAPS_API_KEY_HERE'` or set the `REACT_APP_GOOGLE_MAPS_API_KEY` environment variable.
    -   The frontend proxies API requests to the backend at `http://localhost:3001` (configurable in `package.json`'s `proxy` field).
-   **Setup & Running**:
    ```bash
    cd web_dashboard/frontend
    npm install
    npm start # Runs the app in development mode (usually on http://localhost:3000)
    ```

#### Backend (Node.js/Express App - `web_dashboard/backend/`)
-   **Purpose**: Provides API endpoints for crime data.
-   **Dependencies**: `express`, `mongoose`, `cors`, `dotenv`, `axios`, `helmet`, `express-rate-limit`, `morgan`, `jsonwebtoken`, `bcryptjs`, `express-validator`, `multer` (see `package.json`).
-   **Configuration (Environment Variables)**:
    -   `PORT`: Port for the backend server (e.g., `3001`).
    -   `MONGODB_URI`: MongoDB connection string (e.g., `mongodb://localhost:27017/guardian_ai_saps_db`).
    -   `JWT_SECRET`: Secret key for signing JWT authentication tokens (must be a strong, unique string).
    -   `IPGEOLOCATION_API_KEY`: API key for the external IP geolocation service (e.g., from ipgeolocation.io) used by the `/api/util/ip-geolocation` proxy endpoint. This key is managed on the server-side.
    -   `SENTINEL_TENANT_ID`: Your Azure Tenant ID for Microsoft Sentinel integration.
    -   `SENTINEL_CLIENT_ID`: The Application (client) ID of an Azure AD App Registration that has appropriate permissions (e.g., `SecurityEvents.Read.All`, `Incidents.Read.All`) for the Microsoft Graph Security API.
    -   `SENTINEL_CLIENT_SECRET`: The client secret for the Azure AD App Registration.
    -   `SENTINEL_GRAPH_API_ENDPOINT`: (Optional) The Microsoft Graph API endpoint for security data. Defaults to `https://graph.microsoft.com/v1.0/security`. Can be changed for different clouds (e.g., government clouds) or to use the `/beta` endpoint.
    -   `FACE_REC_PY_SERVICE_URL`: (New) URL for the Python-based Face Recognition microservice. Defaults to `http://localhost:5002` if not set (this default is in `faceRecognitionService.js`). This service handles face enrollment, identification, etc.
    -   These are typically set in a `.env` file in the `web_dashboard/backend/` directory, which is loaded by `dotenv`.
-   **Setup & Running**:
    ```bash
    cd web_dashboard/backend
    npm install
    npm run dev   # Starts the server with nodemon (auto-restarts on changes)
    # or
    # npm start   # Starts the server with node
    ```

#### Triggering Microsoft Sentinel Alert Ingestion

Once the backend is configured with the necessary Sentinel API credentials (see Environment Variables), you can trigger the ingestion of alerts/incidents from Sentinel.

*   **Endpoint:** `POST /api/external-sources/sentinel/ingest-alerts`
*   **Authentication:** Requires JWT token from an authenticated user with appropriate roles (e.g., 'Admin', 'SystemAutomationRole').
*   **Request Body (Optional JSON):**
    ```json
    {
      "resourceType": "alerts", // or "incidents" (defaults to "alerts")
      "fetchParams": {
        "top": 50, // Max number of items to fetch
        "$filter": "severity eq 'high' and status ne 'resolved'", // OData filter string
        "$orderby": "createdDateTime desc" // OData orderby string
      }
    }
    ```
    If the body is empty, default parameters will be used (e.g., fetch latest 25 alerts).
*   **Response:**
    *   `202 Accepted`: Indicates the ingestion process has been initiated in the background.
    *   Check server logs for progress and completion status, including any errors during fetching or processing.
*   **Note:** This process fetches data from Sentinel, transforms it according to the mapping defined in `docs/SENTINEL_TO_SECURITY_EVENT_MAPPING.md`, and saves it as `SecurityEvent` documents in the platform's database.

### 6. Prediction Service (`prediction_service/crime_prediction.py`)
-   **Purpose**: Python script for training a crime prediction model.
-   **Language**: Python 3
-   **Dependencies**: `pandas`, `scikit-learn`, `joblib`.
    -   Install: `pip install pandas scikit-learn joblib`
-   **Data Requirement**: A CSV file named `crime_data.csv` must be placed in the `prediction_service/` directory. This file should contain features relevant for crime prediction and a target column (default name: `'target_crime_category'`).
    -   **Example `crime_data.csv` structure** (illustrative):
        ```csv
        timestamp,latitude,longitude,day_of_week,month,hour,beat_id,weather_condition,public_event_nearby,target_crime_category
        2023-01-15T14:30:00,-26.094,28.000,Sunday,1,14,B01,Clear,0,Theft
        2023-01-15T18:00:00,-26.095,28.001,Sunday,1,18,B02,Cloudy,1,Assault
        ...
        ```
    -   The `TARGET_COLUMN` constant in the script should match the name of your target variable in the CSV.
-   **Running**: `python prediction_service/crime_prediction.py`
-   **Output**: Trains a model and saves it as `crime_prediction_model.joblib` in the `prediction_service/` directory. Also prints evaluation metrics.

## LLM & NLP Security Considerations (Phase 3 - Step 10 Outline)

This section outlines potential use cases for Large Language Models (LLMs) and Natural Language Processing (NLP) within the Guardian AI platform for SAPS, along with critical security and ethical considerations. The actual implementation will depend on specific, approved use cases and adherence to legal and ethical guidelines.

### Potential Use Cases for SAPS Intelligence

*   **Analysis of Unstructured Data:**
    *   Extracting entities (names, locations, organizations), relationships, and key events from investigation narratives, witness statements, or officer reports.
    *   Identifying potential PII (Personally Identifiable Information) within large text datasets for review or redaction.
    *   Sentiment analysis on reports or public domain text related to specific events or areas.
*   **Information Retrieval & Summarization:**
    *   Summarizing large volumes of text (e.g., lengthy reports, collections of documents) to quickly identify key information.
    *   Developing a secure, internal Q&A system or chatbot to query knowledge bases (e.g., legal codes, standard operating procedures, past case summaries) – *this requires extremely robust data security and access controls*.
*   **Report Generation Assistance:**
    *   Aiding in drafting standardized sections of reports based on structured data or summaries.
    *   Checking reports for consistency or missing information (e.g., ensuring all required fields in a template are addressed).
*   **Threat Intelligence Enrichment:**
    *   Processing and summarizing threat intelligence feeds or cybersecurity reports.

### Associated Security & Ethical Concerns

Implementing LLM/NLP capabilities requires careful attention to the following:

*   **Prompt Injection:** Protecting against malicious inputs designed to make an LLM bypass its instructions, reveal sensitive information, or perform unintended actions. This involves input sanitization and potentially output validation.
*   **Data Poisoning:** If custom LLMs are trained, ensuring the integrity and security of the training data is paramount to prevent the introduction of vulnerabilities, biases, or backdoors. (Less relevant if using pre-trained models via APIs, but API provider's security is then a factor).
*   **Model Evasion & Adversarial Attacks:** Inputs crafted to bypass safety filters, generate harmful content, or extract confidential information the LLM was exposed to.
*   **PII & Sensitive Data Leakage:** LLMs might inadvertently reveal Personally Identifiable Information or other sensitive data present in their training set or in the prompts they process. Robust PII detection and redaction mechanisms are crucial both for input and output.
*   **API Security for LLM Endpoints:** Any internal or external APIs exposing LLM functionalities must be secured with strong authentication, authorization, input validation, and rate limiting, adhering to OWASP API Security Top 10.
*   **Ethical Use, Bias, and Accuracy:**
    *   Ensuring LLM outputs are fair, unbiased, and factually accurate, especially when used in law enforcement contexts.
    *   Regularly auditing for biases related to race, gender, location, etc.
    *   Clearly indicating when content is AI-generated.
    *   Human oversight is critical for any decisions based on LLM outputs.
*   **Data Residency and Sovereignty:** Ensuring that any data processed by external LLM APIs complies with South African data protection laws (like POPIA) regarding data location and cross-border transfer.
*   **Compliance with Regulations:** Adherence to POPIA, RICA (for communication-related data if applicable), and internal SAPS data handling policies.

### Placeholder Services

*   Backend services like `llm_security/inputAnalyzerService.js` will be developed to include functions for:
    *   `sanitizePrompt(promptString)`: For cleaning user inputs to LLMs.
    *   `analyzeForPII(textString)`: For detecting PII in text.
    *   `filterLLMOutput(outputString)`: For checking and redacting LLM outputs.

### Relevant Libraries & Tools (Examples for Research)

The actual implementation of LLM/NLP security features would benefit from leveraging specialized libraries and tools. The choice would depend on the specific LLM provider (if any), language (Python/Node.js), and depth of security required.

**For Python (if backend microservices or Python scripts are used for NLP):**

*   **PII Detection & Sanitization:**
    *   `Presidio (Microsoft)`: Comprehensive PII detection and anonymization.
    *   `spaCy`: Can be trained for Named Entity Recognition (NER) to identify PII.
    *   `scrubadub`: For removing PII from text.
*   **Prompt Engineering & Security:**
    *   `LangChain`: Framework for developing applications powered by language models; includes utilities for prompt management and chaining.
    *   `Guardrails AI (NVIDIA NeMo Guardrails)`: Programmable guardrails for LLM conversations.
*   **LLM Interaction SDKs:**
    *   `openai`: Official Python client for OpenAI APIs (GPT-3, GPT-4, etc.).
    *   `huggingface_hub` / `transformers`: For accessing and using models from the Hugging Face Hub.
*   **Text Processing & NLP:**
    *   `NLTK`, `spaCy`: General NLP tasks like tokenization, POS tagging, NER that can support security analysis.

**For Node.js (if implementing directly in the current backend):**

*   **PII Detection & Sanitization:**
    *   While Node.js has fewer mature, dedicated PII libraries compared to Python, options include:
        *   Regex-based approaches: Custom regular expressions for common patterns (emails, phones, ID numbers - requires careful crafting for SA context).
        *   `@microsoft/presidio-client` (if Presidio is deployed as a service).
        *   Third-party APIs specializing in PII detection.
        *   (Research needed for up-to-date Node.js PII libraries).
*   **Prompt Engineering & Security:**
    *   `LangChain.js` (JavaScript/TypeScript version of LangChain): Growing capabilities for LLM application development.
    *   Custom input validation and sanitization logic.
*   **LLM Interaction SDKs:**
    *   `openai` (Node.js client).
    *   Libraries for other LLM providers (e.g., Google Gemini, Anthropic Claude).
*   **Text Processing & NLP:**
    *   `natural`: General NLP functionalities for Node.js.
    *   `compromise`: NLP library for parsing and understanding text.

**General Security Tools (Potentially applicable):**

*   **Web Application Firewalls (WAFs):** Can help protect LLM API endpoints from common web attacks.
*   **API Security Gateways:** For managing and securing API access to LLMs.

This list is not exhaustive and serves as a starting point for research when specific LLM/NLP use cases are implemented.

Further development in this area will require specific approved use cases and a thorough risk assessment for each.

## Placeholder API Keys and Configuration

Throughout the codebase, placeholder values are used for API keys, database connection strings, and other sensitive configurations. These are typically marked with `YOUR_..._HERE` or similar. **It is crucial to replace these with actual, valid credentials and settings before running the components.**

For production environments, always use secure methods for managing these configurations, such as environment variables, `.env` files (with `python-dotenv` for Python or `dotenv` for Node.js), or dedicated secrets management services.

## Contributing

(Placeholder for contribution guidelines - if this were an open project)