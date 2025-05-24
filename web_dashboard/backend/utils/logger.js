// web_dashboard/backend/utils/logger.js
const fs = require('fs');
const path = require('path');

// Ensure 'logs' directory exists if file logging is enabled
const logsDir = path.join(__dirname, '../logs'); // Adjust path relative to utils directory
if (!fs.existsSync(logsDir)) {
    // fs.mkdirSync(logsDir, { recursive: true }); // Uncomment if enabling file logging by default
    console.log("Log directory 'logs' (relative to backend root) would be created here if file logging in logger.js were enabled by default.");
}

// Audit Logger
// In a production environment, consider using a more robust logging library (e.g., Winston, Pino)
// and direct logs to a dedicated file, database, or a centralized logging service.
const auditLog = (level, event, userId, details = {}) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level, // e.g., 'INFO', 'WARN', 'ERROR'
        event, // e.g., 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'CRIME_DATA_CREATED'
        userId: userId ? userId.toString() : 'System',
        details: details // Additional context (e.g., IP address, resource ID)
    };
    
    // For now, just console.log. Replace with actual logging mechanism.
    console.log(`AUDIT_LOG: ${JSON.stringify(logEntry)}`);

    // Example: Writing to a file (ensure 'logs' directory exists and path is correct)
    // const logFilePath = path.join(logsDir, 'audit.log');
    // fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n', err => {
    //     if (err) console.error('Failed to write to audit log:', err);
    // });
};

// You could also add other types of loggers here (e.g., general app logger)
// const appLog = (level, message, details = {}) => { ... };

module.exports = { auditLog /*, appLog */ };
