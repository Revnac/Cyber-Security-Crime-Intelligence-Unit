# Standard Operating Procedure: Evidence Intake

This document outlines the standard procedure for the intake of digital evidence to ensure its integrity and maintain the chain of custody.

## 1. Verify Legal Authority
- **Action:** Confirm the presence and validity of legal authority (e.g., warrant, court order, or consent form) before taking possession of any evidence.
- **Documentation:** Record the type of legal authority and any associated case numbers in the Chain of Custody form.

## 2. Photograph and Log Evidence
- **Action:** Photograph the evidence in its original state and location, if possible. Note any physical damage.
- **Documentation:** Log each item of evidence, including make, model, serial number, and a detailed description. Assign a unique evidence ID number.

## 3. Attach Write-Blocker
- **Action:** Before connecting any evidence media to a forensics workstation, a hardware write-blocker must be attached.
- **Rationale:** This prevents any modification of the original evidence, preserving its integrity.

## 4. Create Forensic Image
- **Action:** Create a bit-for-bit forensic image of the evidence media using an approved imaging tool (e.g., Guymager, dcfldd).
- **Verification:** Calculate a SHA256 hash of the original media and the forensic image. The hashes must match.
- **Documentation:** Record both hashes in the case notes and on the Chain of Custody form.

## 5. Secure Original Media
- **Action:** After imaging is complete, place the original evidence media in a sealed, anti-static bag.
- **Storage:** Store the sealed evidence in a designated, secure evidence locker.
- **Documentation:** Update the Chain of Custody log with the storage location.

## 6. Work on a Verified Copy
- **Action:** All forensic analysis must be performed on a copy of the forensic image, never on the original image itself.
- **Rationale:** This protects the integrity of the primary forensic image (the "evidence file").

## 7. Maintain Chain of Custody
- **Action:** Every person who handles the evidence, and every action taken, must be documented in the Chain of Custody log.
- **Details:** The log must include dates, times, names, and the purpose of handling.
