# face_recognition_service_py/Dockerfile
# Placeholder Dockerfile for Python Face Recognition Service

# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy the requirements file into the container at /usr/src/app
COPY requirements.txt ./

# Install any needed packages specified in requirements.txt
# This will also install OpenCV, Dlib, TensorFlow, Flask, etc.
# May need build essentials and CMake for Dlib compilation if not using pre-built wheels
# RUN apt-get update && apt-get install -y --no-install-recommends \
#    build-essential \
#    cmake \
#    libgl1-mesa-glx \
#    libglib2.0-0 \
#    && rm -rf /var/lib/apt/lists/* 
# The above RUN command for system dependencies is often needed for OpenCV/Dlib.
# For simplicity in this placeholder, we'll assume wheels are available or these are handled.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code into the container
COPY . .

# Copy model files (this assumes models are in a 'models' subdirectory relative to Dockerfile)
# Ensure models are present during build or mounted as volumes in production.
# For now, this Dockerfile does not copy models from the build context to keep image small.
# Models should ideally be downloaded/mounted into the 'models' directory at runtime or in a separate build stage.
# RUN mkdir -p models 
# COPY models/* ./models/ 
# This is commented out as models are large and should not be in the git repo / docker image layer directly.

# Application metadata (optional)
LABEL maintainer="SAPS Intelligence Unit Development Team <contact@saps.gov.za>"
LABEL version="0.1.0"
LABEL description="Guardian AI Face Recognition Python Service"

# Expose the port the app runs on (should match FACE_REC_PY_PORT, default 5002)
EXPOSE ${FACE_REC_PY_PORT:-5002}

# Healthcheck (optional, but good practice)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=1m \
#   CMD python -m http.client localhost:${FACE_REC_PY_PORT:-5002}/health || exit 1
# (Requires /health endpoint in Python app.py)

# Environment variable for Python environment (optional, can be set at runtime)
# ENV PYTHONUNBUFFERED=1
# ENV FACE_REC_PY_PORT=5002 (can be set here or by runtime)

# Command to run the application (using Gunicorn for production if it's in requirements.txt)
# For development: CMD [ "python", "app.py" ]
# For production with Gunicorn (assuming app:app is your Flask app instance in app.py):
CMD ["gunicorn", "--bind", "0.0.0.0:${FACE_REC_PY_PORT:-5002}", "app:app"]
# If Gunicorn is not used, fall back to: CMD [ "python", "./app.py" ]
