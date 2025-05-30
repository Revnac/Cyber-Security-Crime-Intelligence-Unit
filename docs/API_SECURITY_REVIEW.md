# API Security Review (OWASP API Security Top 10 - 2023)

This document reviews the Guardian AI platform's backend API against the OWASP API Security Top 10 (2023) and identifies current controls and areas for potential improvement.

---

**API1:2023 - Broken Object Level Authorization (BOLA)**

*   **Description:** APIs tend to expose endpoints that handle object identifiers, creating a wide attack surface Level Access Control issue. Authorization checks should be performed for every function that accesses a data source using an ID from the user.
*   **Current Controls:**
    *   Most data-accessing routes (e.g., `/api/aml/cases/:id`, `/api/crypto/transactions/:txHashOrId`, `/api/events/:eventId`) are protected by `protect` (authentication) and `authorize` (role-based authorization) middleware. This restricts *which roles* can access these types of endpoints.
    *   For creating data (e.g., adding notes to a case, linking transactions), the `req.user._id` is used as the author/modifier, which is good.
*   **Areas for Improvement/Hardening:**
    *   **Object Ownership/Access Context:** While roles control access to *types* of data, we generally do not have explicit object-level checks for *specific instances* of data. For example:
        *   Can Analyst A update an AML case currently assigned to Analyst B? (The `PUT /api/aml/cases/:id` currently allows any user with the authorized role to update any case).
        *   This would require fetching the object first, then checking an `assignedTo` or `createdBy` field against `req.user._id` or user's group/unit before allowing modification.
    *   **Recommendation:** For critical resources like `AMLCase`, implement service-layer checks in `PUT` operations to verify if `req.user._id` matches `amlCase.assignedTo` or if the user has a superseding role (e.g., 'Admin').

---

**API2:2023 - Broken Authentication**

*   **Description:** Authentication mechanisms are often implemented incorrectly, allowing attackers to compromise authentication tokens or to exploit implementation flaws to assume other users' identities temporarily or permanently.
*   **Current Controls:**
    *   JWT-based authentication (`jsonwebtoken` library).
    *   Passwords hashed using `bcryptjs` (User model pre-save hook).
    *   Password minimum length (8 chars) in User model validation.
    *   Login endpoint (`POST /api/auth/login`) uses password comparison.
    *   Rate limiting applied to all `/api` routes, including auth, providing some brute-force protection.
    *   `JWT_SECRET` is intended to be an environment variable.
    *   Token expiry is implemented (`JWT_EXPIRES_IN`).
*   **Areas for Improvement/Hardening:**
    *   **Token Refresh Mechanism:** No explicit refresh token mechanism is currently implemented. Long-lived JWTs are generally discouraged. Implementing refresh tokens would enhance security.
    *   **Stronger Password Policy:** Consider enforcing more complex password policies (uppercase, lowercase, numbers, symbols) via validation in the User model or registration endpoint.
    *   **Secure Token Storage (Client-Side):** While not strictly backend, advise frontend to store JWTs securely (e.g., HttpOnly cookies if same-site, or secure browser storage with XSS mitigation). `localStorage` is currently used by frontend service placeholders.
    *   **Token Invalidation on Logout:** Currently, logout is client-side (`localStorage.removeItem`). For true server-side invalidation, a token blocklist (e.g., using Redis) would be needed, which adds complexity.
    *   **Account Lockout after Failed Attempts:** Consider implementing account lockout after multiple failed login attempts for a specific user.
    *   **Review `JWT_SECRET` Strength:** Emphasize the need for a strong, randomly generated secret in production.

---

**API3:2023 - Broken Object Property Level Authorization**

*   **Description:** This category combines API9:2019 (Improper Assets Management) and API6:2019 (Mass Assignment) focusing on the root causes: lack of or improper authorization validation at the object property level. This leads to information disclosure or data tampering by an attacker.
*   **Current Controls:**
    *   **Data Exposure (Output):**
        *   Mongoose's `.select('-password')` is used in `authMiddleware` when attaching user to `req.user`.
        *   Some populated fields in GET routes use `.populate('field', 'selected attributes')` to limit exposed data from related models (e.g., `assignedTo` in `amlRoutes`).
        *   `.lean()` is used in some GET routes, which can be good for performance but bypasses Mongoose getters/setters (ensure no sensitive virtuals are exposed).
    *   **Mass Assignment (Input):**
        *   `express-validator` is used for input validation on most `POST`/`PUT` routes, which helps define expected fields.
        *   In `PUT /api/aml/cases/:id`, an explicit `updatableFields` array is used to control which fields from `req.body` are applied to the Mongoose document. This is good practice.
*   **Areas for Improvement/Hardening:**
    *   **Systematic Review of Output Exposure:** Ensure all GET endpoints (especially for lists and details) only return necessary fields. For example, `rawData` in `SecurityEvent` might be very large or sensitive and could be restricted by role or only available on a specific detail endpoint.
    *   **Systematic Review of Input Mass Assignment Protection:** Ensure the pattern of using an `updatableFields` allowlist (or a similar denylist approach using `delete req.body.field_to_ignore`) is consistently applied across all `PUT`/`PATCH` operations, especially where `Object.assign()` or spread operators (`...req.body`) might be used with Mongoose documents. Mongoose schema does inherently protect against undefined fields being saved, but explicit control is better for security-relevant fields like `role` on a user object.
    *   **Role-Based Field Access:** Consider if different roles should see different properties of the same object or be allowed to update different properties. (e.g., an Analyst can update `status` but not `assignedTo`, while an Admin can). This requires more granular logic.

---

**API4:2023 - Unrestricted Resource Consumption**

*   **Description:** APIs do not always impose restrictions on the size or number of resources that can be requested or uploaded by the client/user. This can impact the API server performance, leading to Denial of Service (DoS), and increase operational costs.
*   **Current Controls:**
    *   **Rate Limiting:** `express-rate-limit` applied to all `/api` routes (`max: 100` per 15 mins per IP). A stricter limiter could be applied to `/api/auth/login`.
    *   **Pagination:** List endpoints (e.g., `/api/crypto/transactions`, `/api/aml/cases`, `/api/events`) use pagination (`page`, `limit`) with a default limit (e.g., 20 or 100) and a max limit enforced by validation (e.g., max 100 or 200).
    *   **File Upload Limits:** `multer` configuration for CSV uploads (`fiatIngestionRoutes.js`, `ingestion.js` for crypto) includes a `fileSize` limit (e.g., 50MB).
*   **Areas for Improvement/Hardening:**
    *   **Query Complexity:** Deeply nested queries or regexes with wildcards on non-indexed fields can be resource-intensive for MongoDB. Review complex query filters.
    *   **Response Size Limits:** Consider if individual API responses (especially those returning `rawData` or many populated fields) could become excessively large. Implement truncation or server-side limits if necessary.
    *   **Maximum Depth for Population:** For Mongoose `populate()`, ensure there's no risk of circular population or excessive depth that could lead to large responses or server strain.

---

**API5:2023 - Broken Function Level Authorization**

*   **Description:** Complex access control policies with different hierarchies, groups, and roles, and an unclear separation between administrative and regular functions, tend to lead to authorization flaws. By exploiting these issues, attackers gain access to other users’ resources and/or administrative functions.
*   **Current Controls:**
    *   `protect` middleware ensures authentication for most data-related routes.
    *   `authorize(rolesArray)` middleware is used on many routes to restrict access to specific roles (e.g., Admin-only for ingestion triggers, Analyst/Investigator/Admin for case updates).
    *   The `User` model has a `roles` array with an enum.
*   **Areas for Improvement/Hardening:**
    *   **Systematic Review:** Conduct a thorough review of ALL routes to ensure that every route has appropriate `protect` and `authorize` middleware applied, and that the roles defined are the minimum necessary for that function.
    *   **Default Deny:** Ensure that if authorization middleware is accidentally missed, access is denied by default (currently, if `protect` is there but `authorize` is missing, any authenticated user can access; this might be too permissive for some functions).
    *   **Consistency:** Ensure consistent application of roles. For example, if 'DataEntryClerk' can upload fiat CSVs, can they also upload crypto CSVs? (Currently, crypto CSV ingestion trigger in `externalDataSourceRoutes.js` for Sentinel uses `authorize(['Admin', 'SystemAutomationRole'])` - need to align if these are user-triggered). The `ingestion.js` for crypto CSVs wasn't explicitly given an endpoint in recent plans, but the original `cryptoIngestionService.js` exists.

---

**API6:2023 - Unrestricted Access to Sensitive Business Flows** - *Low current applicability*

*   **Description:** APIs related to business flows that are sensitive (e.g., purchasing a product, booking a flight, etc.) might be vulnerable to abuse if the API does not restrict access to them in a proper way. Attackers can abuse these flows if they understand how the API works and there are no restrictions on how many times or how fast they can access them.
*   **Current Controls:** The application doesn't have many multi-step "business flows" exposed via distinct API calls yet that are obvious targets for this (e.g., a checkout process). Rate limiting provides some general protection.
*   **Areas for Improvement/Hardening:** If flows like "submit event -> analyze -> create case -> assign case" become more automated and exposed via chained API calls, ensure each step is properly authorized and rate-limited to prevent abuse of the flow itself.

---

**API7:2023 - Server Side Request Forgery (SSRF)**

*   **Description:** SSRF flaws occur when an API is fetching a remote resource without validating the user-supplied URI. This enables an attacker to coerce the application to send a crafted request to an unexpected destination, even when protected by a firewall or VPN.
*   **Current Controls:**
    *   The application currently makes outbound requests in `sentinelIntegrationService.js` (to Microsoft Graph) and `utilityRoutes.js` (to `ipgeolocation.io`).
    *   The URLs for these external services are constructed server-side, with only specific parts (like IP address in `utilityRoutes`) coming from user input, which is then validated (e.g., `isIP()`).
    *   No current endpoints directly accept a full URL from the client for the server to fetch.
*   **Areas for Improvement/Hardening:**
    *   **Vigilance:** Maintain this practice. If future features require the server to fetch resources based on user-supplied URLs or parts of URLs, implement strict allow-lists for domains/protocols, and thorough validation/sanitization of the URL components.
    *   Network segmentation for the server could limit the impact of a successful SSRF.

---

**API8:2023 - Security Misconfiguration**

*   **Description:** Security misconfiguration is commonly a result of insecure default configurations, incomplete or ad-hoc configurations, open cloud storage, misconfigured HTTP headers, unnecessary HTTP methods, permissive Cross-Origin resource sharing (CORS), and verbose error messages containing sensitive information.
*   **Current Controls:**
    *   `helmet` middleware is used to set various security headers.
    *   `express-rate-limit` is in place.
    *   MongoDB connection string and `JWT_SECRET` are intended to be environment variables.
    *   Global error handler in `app.js` aims to prevent stack traces/detailed errors from going to client in production (`process.env.NODE_ENV === 'development' ? err.stack : undefined`).
*   **Areas for Improvement/Hardening:**
    *   **CORS:** Currently `app.use(cors());` is used, which is very permissive. In production, this **MUST** be configured to whitelist only the specific frontend domain(s). (Planned for 15.1.2).
    *   **HTTP Headers Review:** While `helmet` provides good defaults, review its configuration for any specific needs (e.g., Content Security Policy - CSP, HSTS).
    *   **Unnecessary HTTP Methods:** Review if any routes might respond to methods they shouldn't (Express usually handles this well by default, only responding to explicitly defined methods).
    *   **Environment Variable Management:** Ensure `.env` files are in `.gitignore` and a `.env.example` is provided. Stress the importance of strong, unique secrets in production.
    *   **MongoDB Security:** Ensure MongoDB is configured securely (authentication, network access restrictions, least privilege for app user). This is outside the app code but crucial.

---

**API9:2023 - Improper Inventory Management**

*   **Description:** APIs may have multiple versions, some of which may be deprecated but still accessible. Attackers can exploit older, unpatched versions to compromise systems. Proper inventory management, including documentation and retirement of old versions, is crucial.
*   **Current Controls:**
    *   Currently, the API is unversioned (implicit v1).
    *   The codebase is managed in Git.
*   **Areas for Improvement/Hardening:**
    *   **API Versioning:** As the API evolves, implement a clear versioning strategy (e.g., `/api/v1/...`, `/api/v2/...`) if breaking changes are introduced.
    *   **API Documentation:** Maintain up-to-date documentation for all API endpoints, their parameters, expected responses, and authentication/authorization requirements. (Swagger/OpenAPI could be integrated later).
    *   **Deprecation Strategy:** Have a plan for deprecating and eventually retiring old API versions.
    *   **Environment Segregation:** Clearly differentiate dev, staging, and production API environments.

---

**API10:2023 - Unsafe Consumption of APIs**

*   **Description:** Developers tend to trust data received from third-party APIs more than user input, and so tend to adopt weaker security standards. To compromise APIs, attackers look for flaws in the way they consume third-party APIs rather than in the API itself.
*   **Current Controls:**
    *   **`sentinelIntegrationService.js`:** Makes calls to Microsoft Graph API. Uses `axios`. Includes timeouts. Error responses from `axios` are caught.
    *   **`utilityRoutes.js` (IP Geolocation Proxy):** Makes calls to `ipgeolocation.io`. Uses `axios`. Includes timeouts. Curates the response before sending to client.
*   **Areas for Improvement/Hardening:**
    *   **Input Validation for External API Data (Trust but Verify):** Before saving or deeply processing data from Sentinel or IPGeolocation into our database or using it in critical logic, perform sanity checks or validation on the received data structure and types, even if the API is trusted. (e.g., does `latitude` look like a valid latitude?).
    *   **Error Handling for External APIs:** Ensure that failures or unexpected responses from external APIs are handled gracefully and do not crash our server or lead to insecure states. The current `try-catch` blocks are a good start.
    *   **Resource Limits:** Be mindful if an external API call could be triggered in a way that leads to excessive calls from our server (e.g., if a user could somehow cause many proxy calls). Rate limiting on our endpoints that trigger these helps.
    *   **Key Security:** Ensure API keys for external services (`IPGEOLOCATION_API_KEY`, Sentinel client secret) are stored securely as environment variables and not exposed.

---

This review provides a baseline. Security is an ongoing process, and regular reviews, testing (including penetration testing), and updates are essential.
---

## Penetration Testing Preparation Guide

This section outlines considerations for preparing for and conducting a penetration test on the Guardian AI platform's backend APIs.

### 1. Scope of Test

A penetration test should prioritize APIs that handle sensitive data, authentication, authorization, and critical business logic. Key areas include:

*   **Authentication & Authorization APIs (`/api/auth`):**
    *   User registration, login (including password policies, JWT generation & validation).
    *   Role-based access controls (`protect` and `authorize` middleware effectiveness).
    *   Session management (if applicable, though currently JWT based).
*   **AML Case Management APIs (`/api/aml/cases`):**
    *   CRUD operations on AML cases.
    *   Object-level authorization (e.g., can one analyst view/modify another's case if not permitted by role?).
    *   Input validation for case updates and note additions.
    *   Access to linked transactions (fiat/crypto).
*   **Transaction Data APIs (`/api/crypto/transactions`, `/api/fiat/transactions`):**
    *   Access controls for listing and viewing transaction details.
    *   Input validation on filter parameters.
*   **Data Ingestion APIs (`/api/ingest/csv`, `/api/ingest/fiat/csv`, `/api/external-sources/sentinel/ingest-alerts`):**
    *   File upload mechanisms (vulnerabilities like path traversal, unrestricted file types if filter fails, resource exhaustion).
    *   Authentication and authorization for triggering ingestion.
    *   Validation of data being ingested (though primary validation is on models/services).
*   **Security Event APIs (`/api/events`):**
    *   Access controls and input validation for querying security events.
*   **Face Recognition Service API (Python Service - `/enroll`, `/identify`, etc.):**
    *   Input validation (image data, subject IDs).
    *   Authentication/authorization for accessing this service (if an API key or other mechanism is added between Node.js backend and Python service).
    *   Protection of the biometric data/templates (conceptual, as this is handled by the specialized engine).
*   **Utility APIs (`/api/util/ip-geolocation`):**
    *   Protection against abuse (rate limiting already in place).
    *   Validation of parameters (e.g., IP address format).

### 2. Testing Methodologies

A combination of methodologies is recommended:

*   **Grey Box Testing:** Testers are provided with user credentials for different roles (e.g., Admin, Analyst, ReadOnly) and some knowledge of the API structure (e.g., API documentation or route files). This is often the most efficient for API testing.
*   **Black Box Testing:** Testers have no prior knowledge of the internal workings or API structure, simulating an external attacker.
*   **White Box Testing (Code Review):** If possible, a secure code review alongside dynamic testing can uncover deeper vulnerabilities.

### 3. Information for Testers

*   **Authentication:** Provide testers with:
    *   Test user accounts with pre-defined roles (e.g., one 'Admin' user, one 'Analyst' user, one 'ReadOnly' user).
    *   Instructions on how to authenticate and obtain JWTs (e.g., using the `/api/auth/login` endpoint).
    *   Details of token handling expectations.
*   **API Documentation:**
    *   Provide access to the source code for routes (e.g., `authRoutes.js`, `amlRoutes.js`, `cryptoRoutes.js`, `fiatRoutes.js`, `ingestionRoutes.js`, `fiatIngestionRoutes.js`, `utilityRoutes.js`, `externalDataSourceRoutes.js`, `securityEventRoutes.js` in `web_dashboard/backend/routes/`).
    *   (Future) Link to any generated OpenAPI/Swagger documentation.
*   **Key Areas of Concern (from OWASP Review):**
    *   **API1: Broken Object Level Authorization:** Specifically test in `amlRoutes.js` and any other routes that deal with specific resource IDs.
    *   **API2: Broken Authentication:** Test JWT handling, password policies, potential for token hijacking (if client-side vulnerabilities are in scope).
    *   **API3: Broken Object Property Level Authorization:** Test `PUT` requests for mass assignment vulnerabilities beyond intended fields, and check API responses for any excessive data exposure.
    *   **API5: Broken Function Level Authorization:** Verify that roles correctly restrict access to all API functions and administrative endpoints.
    *   **API8: Security Misconfiguration:** Check CORS policy, security headers (via `helmet`), and error message verbosity.

### 4. Test Environment Setup Considerations

*   **Isolation:** A dedicated, isolated testing environment that mirrors the production setup as closely as possible is crucial. This environment should not contain real sensitive data.
*   **Data:**
    *   The test environment should be populated with a representative set of non-sensitive, synthetic, or thoroughly anonymized data for all relevant models (`User`, `CryptoTransaction`, `FiatTransaction`, `AMLCase`, `SecurityEvent`, `WalletAddress`, `Entity`, `Watchlist`).
    *   This allows testers to perform actions that modify data without impacting real investigations.
*   **Access:**
    *   Provide necessary network access (e.g., VPN, IP whitelisting) for testers to reach the API endpoints of the backend.
    *   If the Python Face Recognition service is in scope and running, provide its URL and any necessary access details.
*   **Tools:** Testers will likely use standard API testing tools (e.g., Postman, Burp Suite, OWASP ZAP). Ensure the environment can handle traffic from these tools.
*   **Logging & Monitoring:**
    *   Enable detailed API request logging and application logging (as configured with `morgan` and `auditLog`) in the test environment.
    *   Monitor server performance and error logs during the test to identify issues triggered by test activities.
*   **Communication Channel:** Establish a clear communication channel with the testers for queries, reporting findings, and discussing potential vulnerabilities.
*   **Reset Mechanism:** Have a way to quickly reset the test environment's data to a known baseline state if needed between test runs.

This guide should be provided to the penetration testing team along with any other relevant architectural diagrams and API documentation.
```
