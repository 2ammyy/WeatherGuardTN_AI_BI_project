import os
import joblib
import logging
from pathlib import Path
import glob

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_latest_model_path():
    """Find the most recent model.pkl file in mlruns directory"""
    try:
        # Search for all model.pkl files in mlruns
        model_files = glob.glob("mlruns/**/artifacts/model.pkl", recursive=True)
        
        if not model_files:
            # Try alternative path with models subdirectory
            model_files = glob.glob("mlruns/**/models/**/artifacts/model.pkl", recursive=True)
        
        if not model_files:
            logger.error("No model.pkl files found in mlruns directory")
            return None
        
        # Sort by modification time (most recent first)
        model_files.sort(key=os.path.getmtime, reverse=True)
        
        logger.info(f"Found {len(model_files)} model files")
        logger.info(f"Most recent: {model_files[0]} (modified: {os.path.getmtime(model_files[0])})")
        
        return model_files[0]
        
    except Exception as e:
        logger.error(f"Error finding model: {e}")
        return None

def identify_model_type(model, model_path):
    """Identify the model type based on the actual model class and file size"""
    # Check the model class first
    model_class = model.__class__.__name__
    logger.info(f"Model class: {model_class}")
    
    if 'LGBMClassifier' in model_class:
        return 'lightgbm'
    elif 'XGBClassifier' in model_class:
        return 'xgboost'
    elif 'RandomForestClassifier' in model_class:
        return 'randomforest'
    else:
        # Fallback to file size-based detection
        file_size = os.path.getsize(model_path)
        logger.info(f"Model file size: {file_size} bytes")
        
        if file_size > 50000:
            return 'randomforest'
        elif file_size > 20000:
            return 'xgboost'  # or lightgbm
        else:
            return 'unknown'

def load_best_model():
    """Load the best model from mlruns"""
    try:
        model_path = get_latest_model_path()
        
        if model_path is None:
            raise FileNotFoundError("No model found in mlruns directory")
        
        logger.info(f"Loading model from {model_path}")
        model = joblib.load(model_path)
        
        # Identify model type based on actual class
        model_type = identify_model_type(model, model_path)
        logger.info(f"Identified model type: {model_type}")
        
        # Log additional model info
        if hasattr(model, 'n_features_in_'):
            logger.info(f"Model expects {model.n_features_in_} features")
        
        return model, model_type
        
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        raise

# Load model at module startup
try:
    best_model, model_type = load_best_model()
    logger.info(f"Successfully loaded {model_type} model")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    best_model, model_type = None, None