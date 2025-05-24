# GuardianAI - Backend

## Description

FastAPI backend for the GuardianAI platform, providing APIs for cyber intelligence tools, external integrations, and crime prediction.

## Structure

The backend is organized as follows:

-   `main.py`: The main FastAPI application file that initializes the app and includes routers.
-   `requirements.txt`: A list of Python dependencies for the backend.
-   `tools/`: Contains modules related to cybersecurity intelligence tools (e.g., `CyberIntelligenceTool.py`).
-   `integrations/`: Contains modules for integrating with external services (e.g., `external_integrations.py` for Meraki, Sentinel).
-   `prediction/`: Contains modules for crime prediction logic (e.g., `prediction.py`).
-   `planning/`: Contains project planning documents (e.g., `project_summary.py`).
-   `__init__.py`: Present in subdirectories to mark them as Python packages.

## Setup Instructions

1.  **Navigate to the backend directory:**
    ```bash
    cd GuardianAI/backend
    ```

2.  **Create a virtual environment:**
    (On macOS/Linux)
    ```bash
    python3 -m venv venv
    source venv/bin/activate
    ```
    (On Windows)
    ```bash
    python -m venv venv
    venv\\Scripts\\activate
    ```

3.  **Install dependencies:**
    Ensure your virtual environment is activated.
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the development server:**
    From the `GuardianAI/backend` directory:
    ```bash
    uvicorn main:app --reload --port 8000
    ```
    The API will be accessible at `http://localhost:8000`.

## API Endpoints

The backend provides the following main groups of API endpoints. Currently, most of these endpoints serve mock data.

-   **`/tools`**: Endpoints for accessing cybersecurity tools.
    -   `POST /tools/analyze-malware`: Mock endpoint for malware analysis requests.
    -   `GET /tools/check-ip-reputation/{ip_address}`: Mock endpoint for checking IP reputation.
    -   `POST /tools/analyze-network-traffic`: Mock endpoint for network traffic analysis.
-   **`/integrations`**: Endpoints for interacting with external services.
    -   `GET /integrations/meraki-events`: Mock endpoint for fetching Meraki security events.
    -   `POST /integrations/sentinel/submit`: Mock endpoint for submitting events to Microsoft Sentinel.
    -   `POST /integrations/saps/submit`: Mock endpoint for submitting events to SAPS Intelligence.
-   **`/predict`**: Endpoints for crime prediction.
    -   `POST /predict/crime`: Mock endpoint for requesting crime predictions based on location and time.

Refer to the FastAPI Swagger UI at `http://localhost:8000/docs` when the server is running for detailed API documentation.
