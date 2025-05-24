import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
import os # Added for path manipulation

# Path for the dummy CSV, ensuring it's in the same directory as the script
# This helps when the script is imported from elsewhere (e.g., main.py)
DUMMY_CSV_PATH = os.path.join(os.path.dirname(__file__), 'crime_data.csv')

def get_crime_prediction(location_info: dict):
    """
    Returns a mock crime prediction.
    In a real scenario, this function would use the location_info
    to query a pre-trained model and return its prediction.
    """
    # The dummy data creation and model training are not needed for this mock function.
    # They can be part of a separate training script or conditional logic if needed.
    print(f"Received location info for prediction: {location_info}")
    return {
        "prediction_area": location_info.get("location", "unknown_area"),
        "risk_level": "mock_medium_prediction_module",
        "confidence": 0.65,
        "details": "Mock prediction based on provided location info."
    }

def example_prediction_function():
    # This is a placeholder.
    # In a real scenario, this function would load data, train a model (or load a pre-trained one),
    # and make predictions.
    print("Original example_prediction_function called. No actual model training or prediction implemented yet.")
    return {"status": "No data or model loaded for prediction."}

def _train_dummy_model_if_needed():
    """
    Internal function to create dummy data and train a model if crime_data.csv doesn't exist.
    This is primarily for testing the script directly.
    """
    if not os.path.exists(DUMMY_CSV_PATH):
        print(f"Creating dummy {DUMMY_CSV_PATH} for direct script run...")
        dummy_data = {'feature1': [1, 2, 3, 4, 5], 'feature2': [4, 5, 6, 7, 8], 'target': [0, 1, 0, 1, 0]} # Added more data
        dummy_df = pd.DataFrame(dummy_data)
        dummy_df.to_csv(DUMMY_CSV_PATH, index=False)
        print(f"Created dummy {DUMMY_CSV_PATH}")

    crime_data = pd.read_csv(DUMMY_CSV_PATH)
    if not crime_data.empty and 'target' in crime_data.columns and len(crime_data.columns) > 1:
        X = crime_data.drop('target', axis=1)
        y = crime_data['target']
        if not X.empty and not y.empty and len(X) > 1 : # Ensure enough samples for split
             X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
             if X_train.empty or y_train.empty or X_test.empty : # Check if splits are valid
                print("Not enough data to train/test the model after splitting.")
             else:
                rf = RandomForestClassifier(n_estimators=100, random_state=42)
                rf.fit(X_train, y_train)
                predictions = rf.predict(X_test)
                print(f"Made {len(predictions)} predictions during dummy model training.")
        else:
            print("Not enough data or target variables to train the model.")
    else:
        print("Crime data is empty or 'target' column is missing or no features available.")


if __name__ == '__main__':
    print("Running prediction.py directly for testing...")
    _train_dummy_model_if_needed()
    
    # Test the get_crime_prediction function
    mock_location = {"location": "test_area_direct_run", "time": "now"}
    prediction_result = get_crime_prediction(mock_location)
    print(f"Result from get_crime_prediction: {prediction_result}")
    
    example_prediction_function()
