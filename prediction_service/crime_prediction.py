# prediction_service/crime_prediction.py
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier # Example model, can be replaced/enhanced
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib # For saving and loading models
import os

# --- Configuration & Constants ---
DATA_FILE_PATH = 'prediction_service/crime_data.csv' # Path to the required CSV data file
MODEL_SAVE_PATH = 'prediction_service/crime_prediction_model.joblib'
TARGET_COLUMN = 'target_crime_category' # Example: Name of the column to predict (e.g., 'crime_type', 'is_high_risk')

# --- Data Loading and Preprocessing ---
def load_and_preprocess_data(file_path):
    """Loads and preprocesses the crime data from a CSV file."""
    print(f"Loading data from {file_path}...")
    if not os.path.exists(file_path):
        print(f"Error: Data file not found at {file_path}.")
        print("Please ensure 'crime_data.csv' exists in the 'prediction_service' directory.")
        print("The CSV should contain features (e.g., location, time, day_of_week, socio_economic_indicators) ")
        print(f"and a target column named '{TARGET_COLUMN}' for prediction.")
        return None, None

    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        print(f"Error loading CSV file: {e}")
        return None, None

    print(f"Data loaded successfully. Shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")

    if TARGET_COLUMN not in df.columns:
        print(f"Error: Target column '{TARGET_COLUMN}' not found in the data.")
        print(f"Available columns: {df.columns.tolist()}")
        return None, None

    # --- Advanced Feature Engineering Placeholder ---
    # Examples: 
    # - Convert date/time columns into cyclical features (hour_sin, hour_cos, month_sin, month_cos)
    # - Create interaction terms (e.g., location_type * time_of_day)
    # - Bin numerical features (e.g., age groups, income brackets if available)
    # - Use external data sources (e.g., weather, public holidays, economic indicators) if available
    # df['hour'] = pd.to_datetime(df['timestamp_column']).dt.hour # Example

    print("Performing basic preprocessing...")
    # Example: Drop rows with missing target
    df.dropna(subset=[TARGET_COLUMN], inplace=True)

    # Define features (X) and target (y)
    X = df.drop(TARGET_COLUMN, axis=1)
    y = df[TARGET_COLUMN]

    # Identify categorical and numerical features for preprocessing
    # This is a simplified example; more sophisticated feature type detection might be needed.
    categorical_features = X.select_dtypes(include=['object', 'category']).columns.tolist()
    numerical_features = X.select_dtypes(include=['int64', 'float64']).columns.tolist()

    # Drop columns that are not features (e.g., IDs, raw date/time if transformed)
    # Example: X = X.drop(['incident_id', 'exact_timestamp'], axis=1, errors='ignore')

    print(f"Identified numerical features: {numerical_features}")
    print(f"Identified categorical features: {categorical_features}")

    # Create preprocessing pipelines for numerical and categorical features
    numerical_transformer = StandardScaler() # Scale numerical features
    categorical_transformer = OneHotEncoder(handle_unknown='ignore') # One-hot encode categorical features

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', numerical_transformer, numerical_features),
            ('cat', categorical_transformer, categorical_features)
        ],
        remainder='passthrough' # Keep other columns (if any) not specified, or use 'drop'
    )

    return X, y, preprocessor

# --- Model Training and Evaluation ---
def train_and_evaluate_model(X, y, preprocessor):
    """Trains a classification model and evaluates its performance."""
    if X is None or y is None:
        return None

    print("Splitting data into training and testing sets...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y if y.nunique() > 1 else None)

    # --- Advanced Model Selection Placeholder ---
    # - Consider other models: Gradient Boosting (XGBoost, LightGBM), SVM, Neural Networks.
    # - Implement hyperparameter tuning (e.g., GridSearchCV, RandomizedSearchCV).
    # - Use cross-validation for more robust evaluation.

    # Create a pipeline with preprocessing and the classifier
    # Using RandomForestClassifier as an example. For advanced use, explore other algorithms.
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced'))
    ])

    # Example of Hyperparameter Tuning (can be computationally intensive)
    # param_grid = {
    #     'classifier__n_estimators': [100, 200],
    #     'classifier__max_depth': [None, 10, 20],
    #     'classifier__min_samples_split': [2, 5]
    # }
    # grid_search = GridSearchCV(model_pipeline, param_grid, cv=3, n_jobs=-1, scoring='accuracy') # or 'f1_weighted'
    # print("Starting hyperparameter tuning with GridSearchCV...")
    # grid_search.fit(X_train, y_train)
    # print(f"Best parameters found: {grid_search.best_params_}")
    # best_model = grid_search.best_estimator_

    print("Training the model...")
    # Remove grid_search and use model_pipeline directly if not tuning, or use best_model from grid_search
    model_pipeline.fit(X_train, y_train)
    best_model = model_pipeline # If not using GridSearchCV

    print("Evaluating the model...")
    y_pred = best_model.predict(X_test)
    y_pred_proba = best_model.predict_proba(X_test) # For probability-based metrics if needed

    print("\n--- Model Evaluation ---")
    print(f"Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    print("-------------------------")

    # --- Advanced Evaluation Placeholder ---
    # - ROC AUC scores, Precision-Recall curves.
    # - Feature importance analysis (e.g., from RandomForest or SHAP values).
    # - Bias and fairness audits if sensitive attributes are present.
    # - Consider domain-specific metrics relevant to SAPS operations.

    return best_model

# --- Model Saving and Loading ---
def save_model(model, file_path):
    """Saves the trained model to a file."""
    if model:
        print(f"Saving model to {file_path}...")
        try:
            joblib.dump(model, file_path)
            print("Model saved successfully.")
        except Exception as e:
            print(f"Error saving model: {e}")

def load_model(file_path):
    """Loads a trained model from a file."""
    print(f"Loading model from {file_path}...")
    if not os.path.exists(file_path):
        print(f"Error: Model file not found at {file_path}.")
        return None
    try:
        model = joblib.load(file_path)
        print("Model loaded successfully.")
        return model
    except Exception as e:
        print(f"Error loading model: {e}")
        return None

# --- Main Execution ---
def main():
    """Main function to run the prediction service operations."""
    print("--- Guardian AI Crime Prediction Service ---")

    # 1. Load and preprocess data
    X, y, preprocessor = load_and_preprocess_data(DATA_FILE_PATH)

    if X is None or y is None:
        print("Exiting due to data loading issues.")
        return

    # 2. Train and evaluate model (or load existing model)
    trained_model = None
    if os.path.exists(MODEL_SAVE_PATH):
        # choice = input(f"A trained model exists at {MODEL_SAVE_PATH}. Load it? (y/n) or Retrain? (r): ").lower()
        # if choice == 'y':
        #     trained_model = load_model(MODEL_SAVE_PATH)
        # elif choice != 'r': # Default to retraining if not 'y'
        #     print("Invalid choice or no choice to load, proceeding to retrain.")
        print(f"Note: A trained model exists at {MODEL_SAVE_PATH}. This script will retrain by default.")
        print("Modify script or implement loading logic if you wish to use the saved model without retraining.")

    # Always retrain for this example, or implement more sophisticated logic for loading/retraining
    # if trained_model is None: 
    print("Proceeding to train a new model...")
    trained_model = train_and_evaluate_model(X, y, preprocessor)

    # 3. Save the trained model
    if trained_model:
        save_model(trained_model, MODEL_SAVE_PATH)

        # --- Placeholder for making predictions on new data ---
        # new_data = pd.DataFrame(...) # Load or create new data for prediction
        # Ensure new_data has the same columns as X_train (before preprocessing)
        # predictions = trained_model.predict(new_data)
        # print(f"Predictions on new data: {predictions}")
    else:
        print("Model training failed or was skipped. No model to save or use.")

    print("--- Prediction Service Run Complete ---")

if __name__ == '__main__':
    # Note: This script requires pandas and scikit-learn.
    # Install them via: pip install pandas scikit-learn joblib
    # You also need to provide a 'crime_data.csv' file in the 'prediction_service' directory.
    # The CSV should contain relevant features and a target column for prediction.
    main()
