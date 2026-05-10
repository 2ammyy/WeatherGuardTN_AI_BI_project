"""Seed ML model entries from MLflow or create demo entries."""
import os
import json
from datetime import datetime, timezone
from app.database import SessionLocal
from app.models.ml_model import MLModel

def seed_ml_models():
    db = SessionLocal()
    existing = db.query(MLModel).count()
    if existing > 0:
        print(f"ℹ️  {existing} ML models already exist, skipping seed")
        db.close()
        return

    models = [
        MLModel(
            name="Weather Risk Predictor",
            version="2.1.0",
            algorithm="LightGBM",
            description="Main production model for weather risk classification across Tunisian governorates. Trained on 5 years of historical weather data.",
            status="production",
            score=0.9234,
            metrics=json.dumps({"accuracy": 0.9234, "f1": 0.9187, "precision": 0.9312, "recall": 0.9065, "mcc": 0.8712}),
            hyperparams=json.dumps({"n_estimators": 500, "max_depth": 12, "learning_rate": 0.05, "num_leaves": 64, "subsample": 0.8, "colsample_bytree": 0.7}),
            mlflow_run_id="a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
            mlflow_model_uri="mlflow-artifacts:/1/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6/artifacts/model",
            is_active=True,
        ),
        MLModel(
            name="Weather Risk Predictor",
            version="2.0.0",
            algorithm="XGBoost",
            description="Previous production model. Replaced by v2.1.0 (LightGBM) due to better inference speed.",
            status="archived",
            score=0.9012,
            metrics=json.dumps({"accuracy": 0.9012, "f1": 0.8945, "precision": 0.9123, "recall": 0.8876, "mcc": 0.8421}),
            hyperparams=json.dumps({"n_estimators": 400, "max_depth": 10, "learning_rate": 0.08, "subsample": 0.85, "colsample_bytree": 0.8}),
            mlflow_run_id="b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7",
            mlflow_model_uri="mlflow-artifacts:/1/b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7/artifacts/model",
            is_active=False,
        ),
        MLModel(
            name="Flood Risk Classifier",
            version="1.0.0",
            algorithm="Random Forest",
            description="Specialized model for flood risk prediction in coastal and low-lying governorates (Tunis, Bizerte, Nabeul, Sousse, Sfax, Gabes).",
            status="staging",
            score=0.8756,
            metrics=json.dumps({"accuracy": 0.8756, "f1": 0.8689, "precision": 0.8843, "recall": 0.8532}),
            hyperparams=json.dumps({"n_estimators": 300, "max_depth": 15, "min_samples_split": 10, "min_samples_leaf": 4}),
            mlflow_run_id="c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8",
            mlflow_model_uri="mlflow-artifacts:/1/c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8/artifacts/model",
            is_active=False,
        ),
        MLModel(
            name="Heatwave Detector",
            version="1.0.0",
            algorithm="XGBoost",
            description="Early warning model for heatwave events in inland governorates (Kairouan, Kasserine, Gafsa, Tozeur, Kebili).",
            status="active",
            score=0.9145,
            metrics=json.dumps({"accuracy": 0.9145, "f1": 0.9087, "precision": 0.9256, "recall": 0.8921}),
            hyperparams=json.dumps({"n_estimators": 350, "max_depth": 10, "learning_rate": 0.06, "subsample": 0.8}),
            mlflow_run_id="d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9",
            is_active=False,
        ),
        MLModel(
            name="Drought Index Model",
            version="0.9.0",
            algorithm="Random Forest",
            description="Experimental model for drought severity assessment. Currently in testing phase with SPI (Standardized Precipitation Index) as target variable.",
            status="draft",
            score=0.7823,
            metrics=json.dumps({"accuracy": 0.7823, "f1": 0.7712, "precision": 0.7956, "recall": 0.7489}),
            hyperparams=json.dumps({"n_estimators": 200, "max_depth": 8, "min_samples_split": 15}),
            is_active=False,
        ),
    ]

    for m in models:
        db.add(m)
    db.commit()
    print(f"✅ Seeded {len(models)} ML models")
    db.close()


if __name__ == "__main__":
    seed_ml_models()
