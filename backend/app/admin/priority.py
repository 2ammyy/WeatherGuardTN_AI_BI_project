"""
AI-powered report priority classifier using scikit-learn TF-IDF + LogisticRegression.
Fully offline, no additional model downloads required.
Trains on seed labeled examples, then predicts priority for any report reason text.
"""

import re
import logging
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix

logger = logging.getLogger(__name__)

# ── Seed training data ──────────────────────────────────────────────
SEED_DATA = [
    # (text, label)
    # high priority
    ("This post contains violent threats against people", "high"),
    ("User is harassing me repeatedly with death threats", "high"),
    ("This content promotes terrorism and violence", "high"),
    ("Someone is planning to cause harm to others", "high"),
    ("This is an emergency situation with immediate danger", "high"),
    ("User posted my private address and phone number", "high"),
    ("This contains hate speech targeting a protected group", "high"),
    ("There is a bomb threat in this post", "high"),
    ("This user is threatening to hurt themselves", "high"),
    ("Child safety violation in this content", "high"),
    ("Immediate danger, someone needs help right now", "high"),
    ("This post encourages suicide or self-harm", "high"),
    ("Fraud or scam targeting vulnerable people", "high"),
    ("Sexual harassment or inappropriate content", "high"),
    ("Doxing - my personal information was leaked", "high"),

    # medium priority
    ("This post has misleading information about weather", "medium"),
    ("User is spreading false rumors about the flood", "medium"),
    ("This comment is disrespectful but not threatening", "medium"),
    ("The content seems inaccurate or unverified", "medium"),
    ("This post contains wrong information about the storm", "medium"),
    ("User is being rude in the comments section", "medium"),
    ("Suspicious account activity, possible bot behavior", "medium"),
    ("This article has biased information", "medium"),
    ("Copyright violation - my photo was used without permission", "medium"),
    ("Impersonation - someone is pretending to be me", "medium"),
    ("This post should be in a different category", "medium"),
    ("The user is spamming multiple posts with links", "medium"),
    ("Misleading headline about weather conditions", "medium"),
    ("Duplicate content already posted by another user", "medium"),
    ("Questionable source of information", "medium"),

    # low priority
    ("Minor spelling mistake in the title", "low"),
    ("This is just a small typo, no big deal", "low"),
    ("The formatting could be better", "low"),
    ("Not a big issue but wanted to report it", "low"),
    ("This post is promotional spam for a product", "low"),
    ("Just advertising, nothing dangerous", "low"),
    ("Low quality content, not very useful", "low"),
    ("This is just a test post, please ignore", "low"),
    ("The user posted in the wrong language", "low"),
    ("Small grammatical errors throughout", "low"),
    ("This is not relevant to weather at all", "low"),
    ("Just a joke post, but maybe inappropriate", "low"),
    ("The image quality is very poor", "low"),
    ("This seems like an old repost", "low"),
    ("Minor issue with the link formatting", "low"),
]

# ── Labels ──
_LABELS = ["high", "medium", "low"]

# ── Scikit-learn pipeline (lazy-loaded) ──
_PIPELINE = None


def _build_pipeline():
    texts = [t for t, _ in SEED_DATA]
    labels = [l for _, l in SEED_DATA]
    pipe = Pipeline([
        ("tfidf", TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 3),
            analyzer="char_wb",
            strip_accents="unicode",
            lowercase=True,
        )),
        ("clf", LogisticRegression(
            C=1.0,
            class_weight="balanced",
            solver="lbfgs",
            max_iter=1000,
            random_state=42,
        )),
    ])
    pipe.fit(texts, labels)
    return pipe


def _get_pipeline():
    global _PIPELINE
    if _PIPELINE is None:
        try:
            _PIPELINE = _build_pipeline()
            logger.info("Priority classifier trained on %d seed examples", len(SEED_DATA))
        except Exception as e:
            logger.warning("Failed to train priority classifier: %s", e)
            _PIPELINE = False
    return _PIPELINE


def classify_priority(reason_text: str, detailed: bool = False) -> dict:
    """
    Returns priority classification for the given text.

    If detailed=False: {'priority': str, 'score': int}
    If detailed=True:  {'priority': str, 'score': int, 'probabilities': dict, 'method': str, 'top_features': list}
    """
    if not reason_text or not reason_text.strip():
        return {"priority": "medium", "score": 50, "method": "fallback", "probabilities": {"high": 0, "medium": 1, "low": 0}}

    pipe = _get_pipeline()

    if pipe and pipe is not False:
        try:
            probs = pipe.predict_proba([reason_text])[0]
            pred = pipe.predict([reason_text])[0]
            confidence = int(round(max(probs) * 100))
            classes = pipe.classes_.tolist()
            prob_dict = {cls: round(float(p), 4) for cls, p in zip(classes, probs)}

            if not detailed:
                return {"priority": pred, "score": min(confidence, 100)}

            # Top features for explanation
            top_features = _get_top_features(pipe, reason_text, top_n=5)

            return {
                "priority": pred,
                "score": min(confidence, 100),
                "probabilities": prob_dict,
                "method": "ml",
                "top_features": top_features,
            }
        except Exception as e:
            logger.warning("Priority prediction error: %s", e)

    result = _rule_based_fallback(reason_text)
    if detailed:
        result["method"] = "rule"
        result["probabilities"] = {result["priority"]: result["score"] / 100}
    return result


def _get_top_features(pipe: Pipeline, text: str, top_n: int = 5) -> list:
    """Extract top TF-IDF features that influenced the prediction."""
    try:
        vectorizer = pipe.named_steps["tfidf"]
        clf = pipe.named_steps["clf"]
        text_vec = vectorizer.transform([text])
        feature_names = vectorizer.get_feature_names_out()

        # Get coefficients for the predicted class
        pred = clf.predict([text])[0]
        class_idx = list(clf.classes_).index(pred)
        coefs = clf.coef_[class_idx]

        # Score each feature
        scores = (text_vec.toarray() * coefs).flatten()
        top_indices = scores.argsort()[-top_n:][::-1]

        features = []
        for idx in top_indices:
            if abs(scores[idx]) > 0:
                features.append({
                    "feature": feature_names[idx],
                    "weight": round(float(scores[idx]), 4),
                })
        return features
    except Exception:
        return []


def _rule_based_fallback(text: str) -> dict:
    """Keyword-based fallback when model fails."""
    text_lower = text.lower()
    high_keywords = [
        "urgent", "emergency", "danger", "threat", "attack", "abuse",
        "violence", "harassment", "illegal", "terror", "bomb", "weapon",
        "suicide", "kill", "death", "fire", "flood", "immediate",
        "critical", "severe", "catastrophe", "crisis",
        "doxing", "child", "safety", "harm", "hate speech",
    ]
    low_keywords = [
        "minor", "trivial", "spam", "advertisement", "promotion",
        "typo", "mistake", "not important", "low priority",
        "formatting", "cosmetic", "small issue",
    ]

    high_score = sum(1 for kw in high_keywords if kw in text_lower)
    low_score = sum(1 for kw in low_keywords if kw in text_lower)

    if high_score > low_score:
        return {"priority": "high", "score": min(60 + high_score * 10, 95)}
    elif low_score > high_score:
        return {"priority": "low", "score": max(30 - low_score * 5, 5)}
    else:
        return {"priority": "medium", "score": 50}


def classify_reports_bulk(reports: list) -> list:
    """Classify priority for a list of (report_id, reason) tuples."""
    results = []
    for rid, reason in reports:
        result = classify_priority(reason)
        results.append((rid, result["priority"], result["score"]))
    return results


def evaluate_model() -> dict:
    """Evaluate model accuracy on its own training data (self-test)."""
    pipe = _get_pipeline()
    if not pipe or pipe is False:
        return {"error": "Model not available"}

    texts = [t for t, _ in SEED_DATA]
    labels = [l for _, l in SEED_DATA]

    preds = pipe.predict(texts)
    probs = pipe.predict_proba(texts)

    # Per-class accuracy
    correct = sum(1 for p, l in zip(preds, labels) if p == l)
    accuracy = round(correct / len(labels), 4)

    # Confusion matrix
    cm = confusion_matrix(labels, preds, labels=_LABELS)

    # Per-class metrics
    report = classification_report(labels, preds, labels=_LABELS, output_dict=True, zero_division=0)

    # Confidence analysis
    confidences = [float(max(p)) for p in probs]
    avg_confidence = round(sum(confidences) / len(confidences), 4)

    # Top typical examples per class
    examples = {}
    for cls in _LABELS:
        cls_indices = [i for i, l in enumerate(labels) if l == cls]
        cls_scores = [(confidences[i], texts[i]) for i in cls_indices]
        cls_scores.sort(reverse=True)
        examples[cls] = [
            {"text": t[:80], "confidence": round(c, 4)}
            for c, t in cls_scores[:3]
        ]

    return {
        "model_type": "TF-IDF + LogisticRegression",
        "seed_examples": len(SEED_DATA),
        "classes": _LABELS,
        "accuracy": accuracy,
        "avg_confidence": avg_confidence,
        "correct": int(correct),
        "total": len(labels),
        "confusion_matrix": cm.tolist(),
        "per_class": {
            cls: {
                "precision": round(report[cls]["precision"], 4),
                "recall": round(report[cls]["recall"], 4),
                "f1_score": round(report[cls]["f1-score"], 4),
                "support": int(report[cls]["support"]),
            }
            for cls in _LABELS
        },
        "example_predictions": examples,
    }


def test_custom_text(text: str) -> dict:
    """Test the model on arbitrary text with detailed output."""
    result = classify_priority(text, detailed=True)
    if "method" not in result:
        result["method"] = "fallback"
    result["input"] = text
    result["input_length"] = len(text)
    return result
