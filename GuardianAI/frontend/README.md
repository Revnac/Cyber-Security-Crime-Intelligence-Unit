# GuardianAI - Frontend

## Description

React-based frontend for the GuardianAI platform, providing a dashboard interface for visualizing crime data and accessing cyber intelligence tools.

## Structure

The frontend is a Create React App application with the following key components:

-   `public/index.html`: The main HTML file for the React application.
-   `src/index.js`: The entry point for the React application.
-   `src/App.js`: The main application component that sets up the overall layout and routing (if any).
-   `src/components/Dashboard.js`: A central component that assembles various widgets and visualizations.
-   `src/components/CrimeMap.js`: Component for displaying crime data on a map (uses `@react-google-maps/api`).
-   `src/components/CrimeChart.js`: Component for displaying crime trends using charts (uses `recharts`).
-   `src/components/CyberIntelWidget.js`: Component for interacting with cyber intelligence tools, such as the IP reputation checker.
-   `src/visualizations/`: Contains placeholder/conceptual visualization scripts like `graph_3d.js` and `ip_mapper.js` which are planned for future integration.

## Setup Instructions

### Prerequisites

-   Node.js (v14 or later recommended)
-   npm (usually comes with Node.js) or yarn

### Installation and Running

1.  **Navigate to the frontend directory:**
    ```bash
    cd GuardianAI/frontend
    ```

2.  **Install dependencies:**
    If using npm:
    ```bash
    npm install
    ```
    If using yarn:
    ```bash
    yarn install
    ```

3.  **Run the development server:**
    If using npm:
    ```bash
    npm start
    ```
    If using yarn:
    ```bash
    yarn start
    ```
    This will typically open the application in your default web browser at `http://localhost:3000`.

## Connection to Backend

The frontend application, particularly features like the IP Reputation widget (`CyberIntelWidget.js`), expects the GuardianAI backend to be running and accessible. By default, it assumes the backend is available at:

`http://localhost:8000`

Ensure the backend server is started and running on this address for full functionality. Backend API endpoints are currently serving mock data.
