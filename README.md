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
    -   **Dependency**: Google Maps API. Include the API script in your HTML file.
    -   **HTML Requirement**: A `<div id='map'></div>` element.
    -   **Configuration**: Replace `'YOUR_API_KEY_HERE'` with your Google Maps API key and your IP Geolocation API key.
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
-   **Dependencies**: `express`, `mongoose`, `cors`, `dotenv` (see `package.json`).
-   **Configuration**:
    -   MongoDB Connection String: In `app.js`, update `MONGODB_URI` or set it as an environment variable. Example: `mongodb://localhost:27017/guardian_ai_saps_db`.
    -   The server runs on port 3001 by default (configurable via `PORT` environment variable or in `app.js`).
-   **Setup & Running**:
    ```bash
    cd web_dashboard/backend
    npm install
    npm run dev   # Starts the server with nodemon (auto-restarts on changes)
    # or
    # npm start   # Starts the server with node
    ```

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

## Placeholder API Keys and Configuration

Throughout the codebase, placeholder values are used for API keys, database connection strings, and other sensitive configurations. These are typically marked with `YOUR_..._HERE` or similar. **It is crucial to replace these with actual, valid credentials and settings before running the components.**

For production environments, always use secure methods for managing these configurations, such as environment variables, `.env` files (with `python-dotenv` for Python or `dotenv` for Node.js), or dedicated secrets management services.

## Contributing

(Placeholder for contribution guidelines - if this were an open project)