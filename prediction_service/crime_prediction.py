# prediction_service/crime_prediction.py
import pandas as pd
import numpy as np # <<< ADDED
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
    print(f"Attempting to load data from {file_path}...")
    if not os.path.exists(file_path):
        print(f"CRITICAL ERROR: Data file not found at {file_path}.")
        print("Please ensure 'crime_data.csv' exists in the 'prediction_service' directory.")
        print("The CSV should contain features (e.g., a 'timestamp' column for time features, ")
        print("'latitude'/'longitude' for geospatial features, other relevant socio-economic indicators, etc.) ")
        print(f"and a target column named '{TARGET_COLUMN}' for prediction.")
        return None, None, None # Adjusted return for consistent signature

    try:
        df = pd.read_csv(file_path)
        print(f"Data loaded successfully. Initial shape: {df.shape}")
        print(f"Initial columns: {df.columns.tolist()}")
    except pd.errors.EmptyDataError:
        print(f"CRITICAL ERROR: The data file {file_path} is empty.")
        return None, None, None
    except pd.errors.ParserError as e:
        print(f"CRITICAL ERROR: Error parsing CSV file {file_path}. Details: {e}")
        return None, None, None
    except Exception as e:
        print(f"CRITICAL ERROR: An unexpected error occurred while loading CSV file {file_path}. Details: {e}")
        return None, None, None

    if TARGET_COLUMN not in df.columns:
        print(f"CRITICAL ERROR: Target column '{TARGET_COLUMN}' not found in the data.")
        print(f"Available columns: {df.columns.tolist()}")
        return None, None, None

    # --- Feature Engineering ---
    print("Starting feature engineering...")

    # Time-Based Features
    # Example: Assuming a 'timestamp' column exists and is in a parsable date/time format
    if 'timestamp' in df.columns:
        try:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df['hour'] = df['timestamp'].dt.hour
            df['day_of_week'] = df['timestamp'].dt.dayofweek # Monday=0, Sunday=6
            df['month'] = df['timestamp'].dt.month
            df['year'] = df['timestamp'].dt.year
            print("Generated time-based features: hour, day_of_week, month, year.")
            # Example for cyclical features (advanced)
            # df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
            # df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
            # df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
            # df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)
            # Consider dropping original 'timestamp' if it's fully processed and not needed directly
            # df.drop('timestamp', axis=1, inplace=True, errors='ignore') 
        except Exception as e:
            print(f"Warning: Error processing 'timestamp' column for time-based features: {e}. Skipping time features.")
    else:
        print("Warning: 'timestamp' column not found. Time-based features cannot be generated.")

    # --- Geospatial Feature Engineering (Conceptual Placeholder) ---
    # If 'latitude' and 'longitude' columns exist:
    # - Could be used directly as numerical features.
    # - Advanced: Create features like 'distance_to_city_center', 'distance_to_known_hotspots',
    #   or categorize into predefined zones/beats if a map is available.
    # - This often requires geospatial libraries (e.g., GeoPandas, Shapely) and additional datasets.
    # Example: df['zone'] = categorize_location_to_zone(df['latitude'], df['longitude'])
    if 'latitude' not in df.columns or 'longitude' not in df.columns:
        print("Warning: 'latitude' or 'longitude' columns not found. Geospatial features may be limited.")


    # --- Interaction Term Engineering (Conceptual Placeholder) ---
    # Consider creating interaction terms if domain knowledge suggests they are relevant.
    # Example: if 'time_period' (e.g., 'night', 'day') and 'area_type' (e.g., 'residential', 'commercial') exist:
    # if 'hour' in df.columns and 'some_categorical_location_feature' in df.columns:
    #   df['time_period'] = pd.cut(df['hour'], bins=[0, 6, 12, 18, 24], labels=['night', 'morning', 'afternoon', 'evening'], right=False)
    #   df['hour_area_interaction'] = df['time_period'].astype(str) + '_' + df['some_categorical_location_feature'].astype(str)
    #   print("Generated example interaction term: 'hour_area_interaction'.")


    print("Performing basic preprocessing (dropping rows with missing target)...")
    df.dropna(subset=[TARGET_COLUMN], inplace=True)
    print(f"Shape after dropping NA in target: {df.shape}")

    if df.empty:
        print("CRITICAL ERROR: DataFrame is empty after dropping rows with missing target values. Cannot proceed.")
        return None, None, None

    # Define features (X) and target (y)
    X = df.drop(TARGET_COLUMN, axis=1)
    y = df[TARGET_COLUMN]

    # Drop other non-feature columns (example: if an ID column exists that's not useful for training)
    # X = X.drop(['incident_id'], axis=1, errors='ignore') 

    # Identify categorical and numerical features for preprocessing *after* feature engineering
    categorical_features = X.select_dtypes(include=['object', 'category']).columns.tolist()
    numerical_features = X.select_dtypes(include=['int64', 'float64', 'int32', 'float32']).columns.tolist() # Added more numeric types

    # Ensure that any new features created (like 'hour', 'day_of_week') are correctly categorized
    # For example, if 'hour' was created and is numeric but should be treated as categorical by one-hot encoding:
    # if 'hour' in numerical_features:
    #     numerical_features.remove('hour')
    #     categorical_features.append('hour')

    print(f"Identified numerical features for scaling: {numerical_features}")
    print(f"Identified categorical features for one-hot encoding: {categorical_features}")
    print(f"Final features for preprocessing: {X.columns.tolist()}")


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

    # --- Advanced Model Selection ---
    # Current model: RandomForestClassifier.
    # For potentially better performance, consider exploring other models:
    # - Gradient Boosting Machines (e.g., XGBoost, LightGBM). These often provide high accuracy.
    #   (Requires installation: pip install xgboost lightgbm)
    # - Support Vector Machines (SVMs) for complex decision boundaries.
    # - Neural Networks (e.g., using Keras/TensorFlow or PyTorch) for very large datasets and complex patterns.
    # Example for XGBoost (would replace RandomForestClassifier in pipeline):
    # from xgboost import XGBClassifier
    # ('classifier', XGBClassifier(random_state=42, use_label_encoder=False, eval_metric='mlogloss'))

    # Create a pipeline with preprocessing and the classifier
    # Using RandomForestClassifier as an example. For advanced use, explore other algorithms.
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('classifier', RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')) # Default, can be tuned
    ])

    # --- Hyperparameter Tuning with GridSearchCV (Example) ---
    # To use GridSearchCV, uncomment the following section and adjust `param_grid`.
    # This can be computationally intensive.
    use_grid_search = False # Set to True to enable GridSearchCV

    if use_grid_search:
        param_grid = {
            'classifier__n_estimators': [100, 200, 300],
            'classifier__max_depth': [None, 10, 20, 30],
            'classifier__min_samples_split': [2, 5, 10],
            'classifier__min_samples_leaf': [1, 2, 4],
            'classifier__class_weight': ['balanced', 'balanced_subsample', None] # if using RandomForest
        }
        # For XGBoost, param_grid would be different, e.g.:
        # 'classifier__learning_rate': [0.01, 0.1, 0.2],
        # 'classifier__n_estimators': [100, 200, 500],
        # 'classifier__max_depth': [3, 5, 7]
        
        grid_search = GridSearchCV(model_pipeline, param_grid, cv=3, n_jobs=-1, scoring='f1_weighted', verbose=2)
        print("Starting hyperparameter tuning with GridSearchCV...")
        grid_search.fit(X_train, y_train)
        print(f"Best parameters found: {grid_search.best_params_}")
        print(f"Best cross-validation score ({grid_search.scoring}): {grid_search.best_score_:.4f}")
        best_model = grid_search.best_estimator_
    else:
        print("Training the model with default/specified parameters (GridSearchCV disabled)...")
        model_pipeline.fit(X_train, y_train)
        best_model = model_pipeline

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

    # --- Advanced Evaluation Metrics & Techniques (Considerations) ---
    # - ROC Curve & AUC Score: Useful for evaluating binary or multi-class classifier performance.
    #   from sklearn.metrics import roc_auc_score, roc_curve
    #   # For multi-class, use roc_auc_score(y_test, y_pred_proba, multi_class='ovr' or 'ovo')
    # - Precision-Recall Curve: Especially useful for imbalanced datasets.
    #   from sklearn.metrics import precision_recall_curve
    # - Feature Importance: Understand which features are driving predictions.
    #   if hasattr(best_model.named_steps['classifier'], 'feature_importances_'):
    #       # Get feature names after one-hot encoding from preprocessor
    #       # This requires careful handling of feature names from ColumnTransformer
    #       # feature_names = best_model.named_steps['preprocessor'].get_feature_names_out()
    #       # importances = best_model.named_steps['classifier'].feature_importances_
    #       # feature_importance_df = pd.DataFrame({'feature': feature_names, 'importance': importances})
    #       # print("\nFeature Importances:\n", feature_importance_df.sort_values(by='importance', ascending=False))
    #       print("\nFeature importances could be extracted here (implementation needed for correct feature names).")
    #   # Alternatively, use model-agnostic methods like SHAP (pip install shap).
    # - Cross-Validation Scores: If not using GridSearchCV for final model, get CV scores for robustness.
    #   from sklearn.model_selection import cross_val_score
    #   # cv_scores = cross_val_score(model_pipeline, X_train, y_train, cv=5, scoring='f1_weighted')
    #   # print(f"\nCross-validation F1 scores: {cv_scores}")
    #   # print(f"Mean CV F1 score: {cv_scores.mean():.4f}")
    # - Bias & Fairness Audits: If data includes sensitive attributes (e.g., demographics),
    #   evaluate model fairness across different groups (requires specialized libraries like Fairlearn).
    # - Domain-Specific Metrics: Consider metrics most relevant to SAPS operational goals.

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
    # Allow retraining via a flag or input
    force_retrain = False # Could be set by command-line arg, e.g., --retrain
    # choice_retrain = input("Force model retraining even if a saved model exists? (y/n, default n): ").lower()
    # if choice_retrain == 'y':
    #     force_retrain = True
        
    if not force_retrain and os.path.exists(MODEL_SAVE_PATH):
        print(f"Found existing model at {MODEL_SAVE_PATH}.")
        choice_load = input("Load this existing model? (y/n, default y): ").lower()
        if choice_load != 'n': # Default to loading if 'n' is not chosen
            trained_model = load_model(MODEL_SAVE_PATH)
        else:
            print("Proceeding to train a new model as per user choice.")
    
    if trained_model is None:
        print("Training a new model...")
        trained_model = train_and_evaluate_model(X, y, preprocessor)
        if trained_model:
            save_model(trained_model, MODEL_SAVE_PATH)
    
    if trained_model:
        print("\n--- Making Predictions (Example on Test Data) ---")
        # For a real scenario, you'd load new, unseen data here.
        # This example uses a subset of the original X_test for demonstration.
        # Ensure this X_test_sample is preprocessed just like training data if it's raw.
        # However, trained_model is a pipeline, so it expects raw X_test_sample.
        
        # To get X_test again for demonstration (usually you'd have new data)
        X_train_temp, X_test_sample, y_train_temp, y_test_sample = train_test_split(X, y, test_size=0.1, random_state=42, stratify=y if y.nunique() > 1 else None)
        
        if not X_test_sample.empty:
            print(f"Predicting on {len(X_test_sample)} new samples (using a test sample for demo)...")
            # The 'trained_model' is a full pipeline, so it handles preprocessing.
            new_predictions = trained_model.predict(X_test_sample)
            new_pred_proba = trained_model.predict_proba(X_test_sample)

            # Display first few predictions as an example
            for i in range(min(len(new_predictions), 5)):
                print(f"  Sample {i+1}: Predicted='{new_predictions[i]}', Probabilities={[f'{p:.2f}' for p in new_pred_proba[i]]}")
            
            # You would then use these predictions for operational purposes.
            # Example: Store predictions, trigger alerts, display on a dashboard.
        else:
            print("No sample data to make predictions on in this example run.")
    else:
        print("No trained model available to make predictions.")

    print("--- Prediction Service Run Complete ---")

if __name__ == '__main__':
    # Note: This script requires pandas and scikit-learn.
    # Install them via: pip install pandas scikit-learn joblib
    # You also need to provide a 'crime_data.csv' file in the 'prediction_service' directory.
    # The CSV should contain relevant features and a target column for prediction.
    main()
