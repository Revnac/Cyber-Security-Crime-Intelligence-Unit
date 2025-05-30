# AI-Powered Behavioral Analytics for AML - Plan & Considerations

This document outlines potential use cases, feature engineering strategies, model types, and data requirements for implementing AI-powered behavioral analytics for Anti-Money Laundering (AML) within the Guardian AI platform.

## 1. Potential AI/ML Use Cases for AML

The goal is to move beyond simple rule-based alerts to detect more complex and nuanced suspicious activities.

*   **Anomaly Detection:**
    *   **Transaction Monitoring:** Identify unusual transaction volumes, frequencies, times of day, or amounts for specific addresses, entities, or across the platform.
    *   **Deviation from Norm:** Detect when an address or entity significantly deviates from its established historical transaction patterns.
    *   **New Address Activity:** Flag new addresses exhibiting immediate high-risk behaviors (e.g., rapid, large in-and-outflows with no prior history).
*   **Pattern Recognition (Unsupervised & Supervised if labeled data becomes available):**
    *   **Structuring/Smurfing:** Detect patterns of many small transactions designed to evade reporting thresholds, potentially across multiple coordinated addresses.
    *   **Pass-Through Accounts/Wallets:** Identify wallets primarily used as intermediaries with quick in-and-out fund movements.
    *   **Chain Hopping/Mixing Indicators:** Identify transactions that show signs of attempting to obscure fund origins through complex paths or known mixer/tumbler services (may require integration with blockchain analytics providers for mixer identification).
    *   **Funneling/Dispersal:** Detect patterns where funds from multiple sources are consolidated into one account/address, or funds from one source are dispersed to many.
*   **Risk Scoring Enhancement:**
    *   **Dynamic Wallet/Address Risk Scoring:** Use transactional behavior (volume, velocity, counterparties, transaction graph metrics) to dynamically update risk scores for `WalletAddress` objects.
    *   **Entity Risk Scoring:** Aggregate risks from associated wallets and transactions to score `Entity` objects.
    *   **Transaction Risk Scoring:** Assign a risk score to individual transactions based on sender/receiver risk, amount, jurisdiction (if known), and pattern matching.
*   **Network/Graph Analysis:**
    *   **Community Detection:** Identify clusters of closely related addresses or entities that may be involved in coordinated illicit activity.
    *   **Centrality Analysis:** Identify key players or chokepoints within a transaction network.
    *   **Link Prediction:** Suggest potential unknown links between entities or addresses based on transaction patterns.

## 2. Feature Engineering Strategies

Effective AI/ML models will depend on rich feature sets derived from `CryptoTransaction`, `FiatTransaction`, `WalletAddress`, and `Entity` data.

*   **Transactional Features (per transaction):**
    *   Amount (raw, and normalized, e.g., vs. average for address).
    *   `valueUSD`.
    *   Time-based features (hour of day, day of week, month - cyclical encoding: sin/cos).
    *   Transaction type (crypto vs. fiat, specific crypto token type).
    *   Number of inputs/outputs.
    *   Ratio of inputs to outputs.
    *   Fees paid (raw, and as a percentage of amount).
*   **Address/Wallet Features (aggregated over time windows or all history):**
    *   Total received/sent volume and count.
    *   Average transaction amount.
    *   Balance (if maintainable).
    *   Frequency of transactions.
    *   Ratio of incoming to outgoing transactions.
    *   Number of unique counterparties.
    *   Risk scores of counterparty addresses/entities (if known).
    *   Age of address (firstSeenAt, lastSeenAt).
    *   Tags associated with the address.
    *   Graph-based features (e.g., degree centrality, PageRank within a local transaction graph).
*   **Entity Features:**
    *   Aggregated risk scores from associated wallets.
    *   Number of associated high-risk wallets/transactions.
    *   Categorical features (type, category, jurisdiction).
*   **Cross-Currency Features:**
    *   Velocity of funds moving between crypto and fiat (if linked).
    *   Use of exchanges as intermediaries between fiat and crypto.

## 3. Potential ML Model Types

*   **Anomaly Detection:**
    *   Isolation Forest
    *   One-Class SVM
    *   Autoencoders (Neural Networks)
    *   Statistical methods (e.g., Z-score, IQR for simple anomalies)
*   **Clustering (Unsupervised):**
    *   K-Means, DBSCAN (for grouping similar addresses/entities by behavior).
*   **Graph Analytics:**
    *   Graph Neural Networks (GNNs) for learning representations of nodes (addresses, transactions) in a graph.
    *   Community detection algorithms (e.g., Louvain, Girvan-Newman).
*   **Supervised Classification (if/when labeled data is available):**
    *   Random Forest, Gradient Boosting (XGBoost, LightGBM)
    *   Logistic Regression
    *   Neural Networks
    *   (Requires a dataset of transactions/entities labeled as 'suspicious' or 'benign' by analysts).

## 4. Data Requirements & Preparation

*   **Historical Data:** Sufficient historical transaction data (both crypto and fiat, if applicable) is crucial for establishing baseline behaviors and training models.
*   **Labeled Data (for supervised models):** A process for analysts to label alerts/cases (e.g., 'confirmed suspicious', 'false positive') will be needed to create training sets for supervised models. This links to the `AMLCase.status` field.
*   **Data Cleaning & Preprocessing:** Handling missing values, normalizing/scaling numerical features, encoding categorical features.
*   **Feature Store (Advanced):** For managing and serving features consistently for training and inference.
*   **Data Refresh/Updates:** Regular updates to models and features as new data comes in.

## 5. Implementation Approach (Conceptual)

*   **Node.js (`amlAnalyticsService.js`):**
    *   Responsible for data retrieval from MongoDB.
    *   Data preprocessing and feature engineering that can be done efficiently in Node.js.
    *   Making API calls to a dedicated Python ML service.
    *   Receiving results (e.g., risk scores, anomaly flags) from the Python service.
    *   Storing these results back into MongoDB (e.g., updating `WalletAddress.riskScore`, creating/updating `AMLCase` or `SecurityEvent` documents).
*   **Python ML Service (Separate Microservice - Conceptual):**
    *   Houses the core ML model training, evaluation, and prediction logic using Python's ML ecosystem (scikit-learn, TensorFlow/Keras, PyTorch, XGBoost, LightGBM, graph libraries).
    *   Exposes API endpoints for the Node.js service to call (e.g., `/train`, `/predict`).
    *   This separation allows leveraging the best tools for each part of the system.

This document serves as an initial guide. Specific model choices and feature engineering will require iterative experimentation and validation.

## 6. Potential Future API Endpoints for AI AML Analytics

As the AI/ML capabilities for AML mature (likely involving a separate Python service), the following API endpoints on the Node.js backend (e.g., under `/api/aml-analytics/` or `/api/ai/aml/`) could be developed to manage and expose these functionalities:

*   **Triggering Model Retraining:**
    *   `POST /api/ai/aml/models/anomaly-detection/retrain`
        *   **Purpose:** Initiates retraining of the anomaly detection model.
        *   **Request Body:** Could include parameters like date ranges for training data, specific data sources, or model configuration overrides.
        *   **Response:** Acknowledgment that retraining has started, possibly with a job ID to track progress.
        *   **Authorization:** Admin role.

*   **Fetching AI-Generated Risk Scores/Insights:**
    *   `GET /api/ai/aml/transactions/:transactionId/risk`
        *   **Purpose:** Retrieves the AI-generated risk score and anomaly details for a specific transaction (crypto or fiat, may need separate routes or type parameter).
        *   **Response:** The content of the `aiTransactionScore` field for that transaction.
    *   `GET /api/ai/aml/wallets/:walletAddressId/risk`
        *   **Purpose:** Retrieves the AI-generated risk assessment for a specific wallet address.
        *   **Response:** The content of the `aiRiskAssessment` field for that wallet.
    *   `GET /api/ai/aml/entities/:entityId/risk`
        *   **Purpose:** Retrieves the AI-generated risk assessment for a specific entity.
        *   **Response:** The content of the `aiRiskAssessment` field for that entity.
    *   `GET /api/ai/aml/cases/:caseId/insights`
        *   **Purpose:** Retrieves AI-generated insights for a specific AML case.
        *   **Response:** The content of the `aiInsights` field for that case.

*   **Triggering On-Demand Analysis:**
    *   `POST /api/ai/aml/predict/transaction-risk`
        *   **Purpose:** Submits a new transaction's data (not yet saved or for "what-if" analysis) to get an immediate AI risk score.
        *   **Request Body:** Transaction data.
        *   **Response:** Risk score and anomaly details (similar to `aiTransactionScore`).
    *   `POST /api/ai/aml/identify-patterns`
        *   **Purpose:** Submits a batch of transactions or criteria to look for specific suspicious patterns (e.g., structuring).
        *   **Request Body:** List of transactions or query parameters.
        *   **Response:** Details of any detected patterns and involved items.

*   **Updating AI Assessments (Manual Override or Feedback Loop):**
    *   `PUT /api/ai/aml/wallets/:walletAddressId/risk`
        *   **Purpose:** Allows an analyst (with proper authorization) to manually override or adjust parts of an AI risk assessment for a wallet, or to provide feedback that could be used in future retraining.
        *   **Request Body:** Fields to update within `aiRiskAssessment`.
    *   Similar PUT endpoints for entities and transaction scores if manual adjustments are permitted.

These endpoints would typically be implemented in a new `amlAnalyticsRoutes.js` file in the backend and would call the corresponding functions in `amlAnalyticsService.js`, which in turn would interact with the conceptual Python ML service for the core AI logic. All such endpoints would require appropriate authentication and authorization.

## 7. Python ML Service API Contract Examples

This section details example API contracts for communication between the Node.js backend (specifically `amlAnalyticsService.js`) and a conceptual Python-based Machine Learning service.

### 7.1. Endpoint: `POST /predict/transaction_risk`

*   **Purpose:** Receives engineered features for a single transaction (crypto or fiat) and returns an AI-generated risk assessment.
*   **Method:** `POST`
*   **URL Path:** `/predict/transaction_risk` (on the Python ML service)
*   **Request Headers:**
    *   `Content-Type: application/json`
    *   (Optional) `X-API-Key`: If the Python service is protected by a simple API key.
*   **Request Body (JSON):**
    An object containing engineered features relevant for risk scoring. The exact features will depend on the model and data availability.
    ```json
    {
      "transaction_id_internal": "some_internal_ref_or_hash", // Original ID from our Node.js backend DB
      "transaction_type__src": "crypto", // 'crypto' or 'fiat'
      "blockchain_or_currency": "Bitcoin", // e.g., 'Bitcoin', 'Ethereum', 'ZAR', 'USD'
      "amount_usd_equivalent": 15000.75,
      "hour_of_day_sin": 0.866,
      "hour_of_day_cos": -0.5,
      "day_of_week_sin": -0.433,
      "day_of_week_cos": -0.900,
      "is_new_counterparty_address": true,
      "sender_wallet_risk_score_ai": 0.65, // If available from previous AI assessment
      "receiver_wallet_risk_score_ai": 0.20,
      "transaction_frequency_sender_last_24h": 5,
      "transaction_frequency_receiver_last_24h": 1,
      "country_risk_sender_code": "NG", // Example: ISO alpha-2 for Nigeria
      "country_risk_receiver_code": "RU", // Example: ISO alpha-2 for Russia
      "related_to_known_high_risk_entity": false,
      "is_token_transaction": true, // For crypto
      "token_type": "ERC-20" // For crypto
      // ... other relevant engineered features ...
    }
    ```
*   **Response Body - Success (200 OK) (JSON):**
    ```json
    {
      "tx_id_internal": "some_internal_ref_or_hash", // Echoing back the ID
      "ai_transaction_score": {
        "score": 0.92, // Normalized risk score (e.g., 0 to 1)
        "is_anomaly": true,
        "model_version": "tx_risk_aml_v1.3.2",
        "anomaly_type": "HighRiskJurisdictionTransfer_HighFrequencySender" // Example category of anomaly
      },
      "contributing_factors": [
        "receiver_country_risk_score:0.8",
        "transaction_frequency_sender_last_24h:5",
        "amount_usd_equivalent:15000.75"
      ],
      "confidence": 0.88 // Confidence of this prediction itself
    }
    ```
*   **Response Body - Error (e.g., 400 Bad Request, 500 Internal Server Error):**
    ```json
    {
      "error": "Invalid input features",
      "details": "Feature 'amount_usd_equivalent' missing or not a number."
    }
    ```
    ```json
    {
      "error": "Prediction model not available",
      "details": "The transaction risk model version 'tx_risk_aml_v1.3.2' is currently offline."
    }
    ```

This API contract will guide the implementation in `amlAnalyticsService.js` (for making the request and handling the response) and the development of the actual Python ML service.
