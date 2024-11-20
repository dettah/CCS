
import os
import joblib
import logging
from rest_framework.response import Response
from rest_framework.decorators import api_view, parser_classes
from django.core.files.storage import default_storage
from rest_framework.parsers import MultiPartParser
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score
from imblearn.over_sampling import SMOTE
from sklearn.preprocessing import StandardScaler


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, 'saved_models', 'churn_mlmod.pkl')

os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)


def mod_eval(model_name, metric):

    csv_path = os.path.join(BASE_DIR, 'data', 'custChurn.csv')
    df = pd.read_csv(csv_path)

    # print(df.shape)
    # print()
    # print(list(df.columns.values))

# Encode categorical data
    df = df.drop(['phone number', 'state'], axis=1)
    cat_cols = df.select_dtypes(include=['object', 'category']).columns
    df = pd.get_dummies(df, columns=cat_cols, drop_first=True)

# Separating feature from target variables
# Drop cols that correlate highly
    X = df.drop(['churn', 'voice mail plan_yes',
                'total night charge', 'total intl charge'], axis=1)
    y = df['churn']

# handling imbalance in dataset if there's any
    smote = SMOTE(random_state=42)
    X_resampled, y_resampled = smote.fit_resample(X, y)


# Feature scaling
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_resampled)

# Convert numpy array back to dataframe
    X = pd.DataFrame(X_scaled, columns=X.columns)

    y = y_resampled
# split into training and test data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42)

# choose which model to use
    if model_name == "Logistic Regression":
        model = LogisticRegression(max_iter=200)

    elif model_name == "Random Forest":
        model = RandomForestClassifier()

    elif model_name == "XGBoost":
        model = xgb_model = XGBClassifier()

    else:
        return {"error": "Invalid model"}

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    joblib.dump({'model': model, 'scaler': scaler}, MODEL_PATH)

    metrics = {
        "Accuracy": accuracy_score(y_test, y_pred),
        "Precision": precision_score(y_test, y_pred, average='macro'),
        "Recall": recall_score(y_test, y_pred, average='macro'),
    }

    return {metric: metrics.get(metric, "Metric not found")}


@api_view(['POST'])
def evaluation_req(request):
    data = request.data
    metric = data.get('metric')
    model = data.get('model')

    logger.info("Received model: %s", model)
    logger.info("Received metric: %s", metric)
    result = mod_eval(model, metric)
    return Response(result)


@api_view(['POST'])
def predict_churn(request):
    data = request.data
    df = pd.DataFrame([data])

    required_cols = [
        'account length', 'area code', 'number vmail messages', 'total day minutes',
        'total day calls', 'total day charge', 'total eve minutes', 'total eve calls',
        'total eve charge', 'total night minutes', 'total night calls', 'total intl minutes',
        'total intl calls', 'customer service calls', 'international plan_yes',
    ]

    for cols in required_cols:
        if cols not in df.columns:
            df[cols] = 0

    df = df[required_cols]

    if os.path.exists(MODEL_PATH):
        # model = joblib.load(MODEL_PATH)
        trained_mod_data = joblib.load(MODEL_PATH)
    else:
        return Response({"error": "Model not found. Please train a model first."})

    # df = pd.get_dummies(
    #     df, columns=['international plan'], drop_first=True)

    model = trained_mod_data['model']
    scaler = trained_mod_data['scaler']
    df_scaled = scaler.transform(df)

    prediction = model.predict(df_scaled)
    result = bool(prediction[0])

    return Response({"prediction": result})


@api_view(['POST'])
@parser_classes([MultiPartParser])
def predict_list_churn(request):
    file = request.FILES.get('file')

    if not file:
        return Response({"error": "No file uploaded"}, status=400)

    try:

        file_path = default_storage.save(file.name, file)
        file_path_dir = os.path.join(default_storage.location, file_path)

        df = pd.read_csv(file_path_dir)

        required_cols = [
            'account length', 'area code', 'number vmail messages', 'total day minutes',
            'total day calls', 'total day charge', 'total eve minutes', 'total eve calls',
            'total eve charge', 'total night minutes', 'total night calls', 'total intl minutes',
            'total intl calls', 'customer service calls', 'international plan_yes'
        ]

        for col in required_cols:
            if col not in df.columns:
                df[col] = 0

        df = df[required_cols]

        # Load the trained model and scaler
        if os.path.exists(MODEL_PATH):
            trained_mod_data = joblib.load(MODEL_PATH)
            model = trained_mod_data['model']
            scaler = trained_mod_data['scaler']
        else:
            return Response({"error": "Model not found. Please train a model first."}, status=500)

        df_scaled = scaler.transform(df)
        predictions = model.predict(df_scaled)

        # Convert predictions to True/False for each row
        results = [{"prediction": bool(pred)} for pred in predictions]

        # Clean up the uploaded file
        default_storage.delete(file_path)

        return Response({"predictions": results})
    
    except Exception as e:
        return Response({"error": str(e)}, status=500)

