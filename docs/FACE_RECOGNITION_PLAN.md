# Face Recognition Technology - Use Cases, Ethical & Security Plan

This document outlines potential use cases, critical ethical considerations, security measures, and compliance requirements for any future incorporation of face recognition technology within the Guardian AI platform for the SAPS Intelligence Unit.

**Overarching Principle:** The use of face recognition technology must be strictly limited, lawful, ethical, necessary, and proportionate, with robust oversight and adherence to all applicable South African laws including the Constitution, POPIA, and RICA (if applicable), as well as internal SAPS directives and human rights principles. **Any implementation requires dedicated legal and ethical review BEFORE development.**

## 1. Potential, Strictly Controlled Use Cases

The following are *potential* areas where face recognition *might* be considered, subject to rigorous review and approval. These are not exhaustive and serve as examples for discussion.

*   **Suspect Identification (Investigative Aid Only):**
    *   Comparing facial images from lawfully obtained evidence (e.g., CCTV from a crime scene, images from a victim's phone related to a specific crime) against a *highly restricted, authorized, and lawfully compiled watchlist* of known, wanted suspects or persons of interest for serious crimes.
    *   **NOT for real-time, mass surveillance or general public screening.**
    *   Output must always be treated as an investigative lead, requiring further human verification and corroborating evidence.
*   **Identification of Missing Persons or Vulnerable Individuals:**
    *   Comparing images of found persons (e.g., disoriented individuals, children) against a secure database of missing persons, with appropriate consent and data protection for the missing persons' data.
*   **Secure Access Control to High-Security SAPS Facilities:**
    *   As a biometric factor for verifying the identity of authorized personnel for entry into sensitive areas (1:1 verification, not 1:N identification against a large staff database without consent).
    *   Must comply with employee data protection rights.
*   **Verification during Lawful Custodial Procedures:**
    *   Verifying the identity of an individual already in lawful custody against their existing official record, to prevent impersonation or confirm identity during processing.

## 2. Critical Ethical Considerations & Human Rights

*   **Privacy:** Face recognition processes biometric data, which is highly sensitive. Collection, use, storage, and deletion must be strictly controlled and minimized.
*   **Bias & Discrimination:** Algorithms can exhibit demographic bias (race, gender, age), leading to higher error rates for certain groups. This can have severe consequences in law enforcement. Any considered system must be rigorously tested for bias.
*   **Accuracy & Reliability:** False positives (incorrectly identifying someone) and false negatives (failing to identify someone) have serious implications. Error rates must be understood and acceptably low for any specific, approved use case.
*   **Misuse & Scope Creep:** Strict policies and technical controls are needed to prevent misuse of the technology beyond its authorized, narrow purpose.
*   **Transparency & Accountability:** Processes for use, data handling, and error correction must be transparent and auditable. There must be clear lines of accountability.
*   **Human Oversight:** AI-generated matches must **never** be the sole basis for law enforcement action. All outputs require confirmation by trained human officers and through other investigative means.
*   **Public Trust:** The use of face recognition by law enforcement is a matter of significant public concern. Transparency and demonstrable adherence to law and ethics are vital.

## 3. Security Measures for Biometric Data

*   **Secure Storage:** Facial templates/embeddings (not raw images, where possible) must be stored with strong encryption at rest and in transit. Access must be strictly controlled and audited.
*   **Data Minimization:** Only necessary data should be collected and retained, and only for the approved duration.
*   **Access Controls:** Role-Based Access Control (RBAC) for any system accessing or managing facial data.
*   **Secure APIs:** If a face recognition engine is accessed via an API, that API must be secured according to best practices (OWASP API Security Top 10).
*   **Presentation Attack Detection (PAD) / Liveness Detection:** The system must be robust against spoofing attempts using photos, videos, or masks if live capture is involved.
*   **Deepfake Detection:** For images/videos submitted as evidence, an assessment of their authenticity (i.e., not deepfakes) may be necessary before processing with face recognition.

## 4. Compliance Requirements (South Africa)

*   **Protection of Personal Information Act (POPIA):**
    *   Facial images and biometric data are "special personal information" under POPIA, requiring stronger justifications for processing and specific consent where applicable, or clear lawful basis.
    *   Conditions for lawful processing (accountability, processing limitation, purpose specification, further processing limitation, information quality, openness, security safeguards, data subject participation) must be met.
*   **RICA (Regulation of Interception of Communications and Provision of Communication-Related Information Act):** If FRT is used in conjunction with communication interception or surveillance.
*   **SAPS Act and Standing Orders:** Internal policies and directives.
*   **Human Rights Framework (Constitution of South Africa):** Right to privacy, dignity, equality.

## 5. Conceptual Technical Approach & Placeholders

*   **Specialized Engine:** Development of a core face recognition engine from scratch is highly complex and generally not feasible. Implementation would rely on:
    *   Integrating a COTS (Commercial Off-The-Shelf) solution vetted for accuracy, bias, and security.
    *   Using a government-provided, authorized national biometric system API (if available).
*   **Backend Service (`face_recognition/faceRecognitionService.js`):**
    *   This Node.js service would act as a secure wrapper or bridge to the specialized engine.
    *   It would handle requests from other parts of the Guardian AI platform.
    *   Placeholder functions: `enrollFace()`, `identifyFace()`, `verifyFace()`, `detectDeepfake()`.
*   **Data Flow:** Secure handling of image/video data, transmission to the engine, and processing of results.

**Conclusion:** The integration of "Highly Advanced Face Recognition" is a high-impact, high-risk area. It requires a cautious, phased approach, starting with extensive legal, ethical, and technical due diligence for any narrowly defined, approved use case before any significant development. The current focus is on documenting these considerations.

### Python Microservice for Face Recognition (`face_recognition_service_py/`)

The core face recognition engine is implemented as a separate Python microservice using Flask. This service handles image processing, model inference, and biometric operations.

**1. Setup Instructions:**

*   Navigate to the service directory: `cd face_recognition_service_py`
*   Create a Python virtual environment:
    ```bash
    python -m venv venv
    ```
*   Activate the virtual environment:
    *   On macOS/Linux: `source venv/bin/activate`
    *   On Windows: `venv\Scripts\activate`
*   Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
*   **Model Files (Crucial Manual Step):**
    *   This service requires pre-trained model files for its operation (e.g., FaceNet model, Dlib shape predictor). These files are **not** included in the repository due to their size and licensing.
    *   You must download the required models (e.g., `facenet_keras.h5`, `shape_predictor_68_face_landmarks.dat`) and place them into the `face_recognition_service_py/models/` directory.
    *   Refer to the comments in `face_recognition_service_py/app.py` and the user-provided Python script for details on the specific models that will be integrated. The `.gitignore` file in the `models/` directory is configured to ignore these large files.

**2. Running the Service:**

*   **Development:**
    ```bash
    python app.py
    ```
    The service will typically start on `http://localhost:5002` (configurable via the `FACE_REC_PY_PORT` environment variable). `debug=True` is enabled for development.
*   **Production (Example):**
    Use a WSGI server like Gunicorn (listed in `requirements.txt`):
    ```bash
    gunicorn --bind 0.0.0.0:5002 app:app 
    ```

**3. API Endpoints:**

*   **Health Check:**
    *   `GET /health`
    *   **Description:** Checks if the service is running.
    *   **Response (200 OK):** `{"status": "healthy", "message": "Face Recognition Python Service is running."}`

*   **Enroll Face:**
    *   `POST /enroll`
    *   **Description:** Receives an image and a subject ID for enrollment. Currently saves the image and returns a pending status. Actual face detection, embedding extraction, and storage are future implementation steps within this service.
    *   **Request:** `multipart/form-data`
        *   `image`: Image file (e.g., .jpg, .png). Max size: 16MB.
        *   `subjectId`: String (Unique identifier for the subject).
    *   **Response (202 Accepted - Placeholder):**
        ```json
        {
          "message": "Enrollment request received successfully. Image saved, processing pending.",
          "subjectId": "user123",
          "filename": "user123_timestamp_image.jpg",
          "savedPath": "/path/to/face_recognition_service_py/uploads/user123_timestamp_image.jpg",
          "status": "pending_embedding_extraction_and_storage"
        }
        ```
    *   **Error Responses:**
        *   `400 Bad Request`: Missing image, missing subjectId, invalid file type, file too large.
        *   `500 Internal Server Error`: If an error occurs during file saving or processing.

*   **Future Endpoints (Placeholders):**
    *   `POST /identify`: For 1:N face identification.
    *   `POST /verify`: For 1:1 face verification.
    *   `POST /detect-deepfake`: For deepfake detection.

**4. Environment Variables:**
*   `FACE_REC_PY_PORT` (Optional): Port for the Flask development server (defaults to 5002 in `app.py`).
*   (Future) `FACENET_MODEL_PATH`, `DLIB_SHAPE_PREDICTOR_PATH`: Paths to the ML model files if made configurable.

## 6. Considerations for Selecting a Face Recognition Engine/Technology

The selection of a specific face recognition engine or technology partner is a critical decision with significant implications. Beyond the specific use case requirements, the following factors must be thoroughly evaluated:

*   **Accuracy & Performance Metrics:**
    *   **False Accept Rate (FAR) / False Match Rate (FMR):** The likelihood of incorrectly matching an unknown person to an enrolled identity.
    *   **False Reject Rate (FRR) / False Non-Match Rate (FNMR):** The likelihood of failing to match an enrolled person to their own identity.
    *   **True Accept Rate (TAR) / True Match Rate (TMR):** The likelihood of correctly matching an enrolled person.
    *   Performance across different demographics (age, gender, ethnicity) to assess bias.
    *   Performance in various conditions (lighting, pose, occlusion, image quality).
    *   Verification (1:1) vs. Identification (1:N) accuracy.
    *   Speed of matching, especially for 1:N identification in large databases.
*   **Bias Evaluation & Mitigation:**
    *   Independent third-party testing and certifications for demographic bias (e.g., NIST FRVT reports).
    *   Vendor transparency regarding training data demographics and bias mitigation efforts.
*   **Liveness Detection & Anti-Spoofing Capabilities:**
    *   Robustness against presentation attacks (photos, videos, 3D masks).
    *   Certification for PAD standards (e.g., ISO/IEC 30107).
*   **Security of Biometric Templates:**
    *   Template encryption methods (at rest and in transit).
    *   Template reversibility (i.e., impossibility or difficulty of recreating a face image from a template).
    *   Secure key management for template protection.
    *   Support for cancellable biometrics (though less common for face).
*   **Database & Scalability:**
    *   Scalability of the engine to handle the required number of enrolled identities and search throughput.
    *   Secure database solutions for storing templates and associated metadata.
*   **Compliance, Certifications & Legal Standing:**
    *   Vendor's adherence to data protection regulations (e.g., GDPR, with considerations for POPIA).
    *   Relevant security certifications (e.g., ISO 27001 for vendor processes).
    *   Legal and ethical track record of the vendor.
    *   "Explainability" of matches or non-matches, if possible.
*   **Integration Capabilities:**
    *   Availability of robust SDKs and APIs (REST, gRPC) for the required programming languages (e.g., Node.js for the bridge service, potentially Python for direct interaction).
    *   Ease of integration with existing SAPS systems and workflows.
    *   Support for on-premise, cloud, or hybrid deployment models as required by SAPS.
*   **Vendor Support & Roadmap:**
    *   Availability of technical support.
    *   Vendor's commitment to ongoing research, development, and improvement (especially regarding accuracy and bias).
*   **Deepfake Detection Capabilities (if applicable):**
    *   If the engine itself offers features for detecting manipulated images/videos, or if it needs to be paired with a separate deepfake detection solution.

Thorough due diligence, proof-of-concept testing, and pilot programs are essential before committing to any specific face recognition technology for law enforcement applications.
```
