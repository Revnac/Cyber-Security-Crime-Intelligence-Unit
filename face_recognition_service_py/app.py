# face_recognition_service_py/app.py
import os
import time # For unique filenames
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import cv2
import dlib
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model

# --- Configuration ---
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Model Paths (Ideally from .env or config file)
MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
FACENET_MODEL_PATH = os.path.join(MODELS_DIR, 'facenet_keras.h5')
DLIB_SHAPE_PREDICTOR_PATH = os.path.join(MODELS_DIR, 'shape_predictor_68_face_landmarks.dat')

# Global model variables
facenet_model = None
dlib_detector = None
dlib_predictor = None # Not used in this version of enroll, but loaded as per user script

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(MODELS_DIR): # Ensure models dir exists for clarity, though user must place files
    os.makedirs(MODELS_DIR)
    print(f"Created models directory: {MODELS_DIR}. Please place model files here.")

def load_all_models():
    global facenet_model, dlib_detector, dlib_predictor
    try:
        if os.path.exists(FACENET_MODEL_PATH):
            facenet_model = load_model(FACENET_MODEL_PATH)
            print("FaceNet model loaded successfully.")
        else:
            print(f"Error: FaceNet model not found at {FACENET_MODEL_PATH}")

        dlib_detector = dlib.get_frontal_face_detector()
        print("Dlib frontal face detector loaded successfully.")

        if os.path.exists(DLIB_SHAPE_PREDICTOR_PATH):
            dlib_predictor = dlib.shape_predictor(DLIB_SHAPE_PREDICTOR_PATH)
            print("Dlib shape predictor loaded successfully.")
        else:
            print(f"Error: Dlib shape predictor not found at {DLIB_SHAPE_PREDICTOR_PATH}")

    except Exception as e:
        print(f"Error loading one or more ML models: {e}")
        print("Face recognition functionality may be impaired.")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_face_embeddings(face_image_rgb): # Expects RGB face ROI
    # Preprocess face image for FaceNet
    face_image_resized = tf.image.resize(face_image_rgb, (160, 160))
    face_image_normalized = tf.cast(face_image_resized, tf.float32) / 255.0
    
    # Extract face embedding (model expects batch dimension)
    embeddings = facenet_model.predict(face_image_normalized[None, ...]) 
    return embeddings # Returns a batch of embeddings, usually one if one face image

# --- API Endpoints ---
@app.route('/health', methods=['GET'])
def health_check():
    # Extended health check could verify model loading status
    models_loaded = facenet_model is not None and dlib_detector is not None # and dlib_predictor is not None
    return jsonify({
        "status": "healthy" if models_loaded else "degraded", 
        "message": "Face Recognition Python Service is running.",
        "models_loaded": {
            "facenet": facenet_model is not None,
            "dlib_detector": dlib_detector is not None,
            "dlib_predictor": dlib_predictor is not None # Check if needed for enroll
        }
    }), 200 if models_loaded else 503

@app.route('/enroll', methods=['POST'])
def enroll_face_endpoint():
    if not facenet_model or not dlib_detector: # dlib_predictor not strictly needed for just FaceNet input ROI
        return jsonify({"error": "ML models not loaded, service unavailable."}), 503

    if 'image' not in request.files:
        return jsonify({"error": "No image file part in the request"}), 400
    file = request.files['image']
    subject_id = request.form.get('subjectId')

    if not subject_id:
        return jsonify({"error": "subjectId is required"}), 400
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{subject_id}_{int(time.time())}_{filename}"
        saved_file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        try:
            file.save(saved_file_path)
            print(f"Image saved to: {saved_file_path}")

            # Process the image
            img_bgr = cv2.imread(saved_file_path)
            if img_bgr is None:
                return jsonify({"error": "Could not read saved image file."}), 500
            
            # Dlib detector works best on grayscale for HOG, but FaceNet needs RGB.
            # We can detect on gray, then extract ROI from color image.
            gray_frame = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
            rgb_frame = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB) # For FaceNet

            faces_dlib = dlib_detector(gray_frame, 1) # Upsample once for better detection

            if len(faces_dlib) == 0:
                # Optionally remove saved file if no face detected
                # os.remove(saved_file_path) 
                return jsonify({"error": "No face detected in the uploaded image by Dlib."}), 400
            
            if len(faces_dlib) > 1:
                print(f"Warning: Multiple faces ({len(faces_dlib)}) detected in enrollment image for {subject_id}. Processing the first one.")
                # Potentially return error or specific handling for multiple faces if required by policy.

            face = faces_dlib[0] # Process the first detected face
            
            # Extract face ROI from the RGB image for FaceNet
            # Ensure ROI coordinates are within image bounds
            top, bottom = max(0, face.top()), min(rgb_frame.shape[0], face.bottom())
            left, right = max(0, face.left()), min(rgb_frame.shape[1], face.right())
            
            if top >= bottom or left >= right: # Check if ROI is valid
                return jsonify({"error": "Invalid face ROI detected."}), 400

            face_roi_rgb = rgb_frame[top:bottom, left:right]

            if face_roi_rgb.size == 0:
                 return jsonify({"error": "Extracted face ROI is empty."}), 400

            # Extract face embeddings
            embeddings_batch = extract_face_embeddings(face_roi_rgb)
            if embeddings_batch is None or len(embeddings_batch) == 0:
                return jsonify({"error": "Failed to extract face embeddings."}), 500
            
            embedding_list = embeddings_batch[0].tolist() # Get first (and only) embedding, convert to list

            # TODO: Securely store subject_id and embedding_list in a vector database or similar.
            # For now, we are not storing it beyond this request lifecycle.
            print(f"Successfully extracted embedding for {subject_id}. Shape: {np.array(embedding_list).shape}")

            return jsonify({
                "message": "Face detected and embedding extracted successfully. Processing complete (no storage implemented yet).",
                "subjectId": subject_id,
                "filename": unique_filename,
                "embedding_shape": np.array(embedding_list).shape,
                "embedding_preview": embedding_list[:5], # Preview first 5 values
                "status": "processed_pending_storage"
            }), 200 # Changed to 200 as processing (embedding) is done for this step
        
        except Exception as e:
            print(f"Error during enrollment processing for {subject_id}: {e}")
            # import traceback
            # traceback.print_exc() # For more detailed server-side error logging during dev
            return jsonify({"error": f"Server error during enrollment processing: {str(e)}"}), 500
    else:
        return jsonify({"error": "File type not allowed. Allowed: png, jpg, jpeg"}), 400

if __name__ == '__main__':
    load_all_models() # Load models when app starts
    app.run(host='0.0.0.0', port=int(os.environ.get('FACE_REC_PY_PORT', 5002)), debug=True)
