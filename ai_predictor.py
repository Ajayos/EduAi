import os
import sys
import json
import random
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib

MODEL_PATH = "student_model.joblib"
_model_cache = None  # In-memory cache


# =========================
# DATA GENERATION (FASTER)
# =========================
def generate_synthetic_data(n=2000):
    data = []

    for _ in range(n):
        attendance = random.uniform(20, 100)
        marks = random.uniform(20, 100)
        cgpa = random.uniform(2, 10)
        study_hours = random.uniform(0, 40)
        assignment = random.uniform(40, 100)
        backlogs = random.randint(0, 5)
        cgpa_growth = random.uniform(-1, 2)

        score = (
            (cgpa * 10 * 0.35)
            + (attendance * 0.15)
            + (marks * 0.25)
            + (study_hours * 0.1)
            + (assignment * 0.1)
            - (backlogs * 5)
            + (cgpa_growth * 5)
        )

        if score >= 80:
            label = 3
        elif score >= 65:
            label = 2
        elif score >= 45:
            label = 1
        else:
            label = 0

        data.append([
            attendance,
            marks,
            cgpa,
            study_hours,
            assignment,
            backlogs,
            cgpa_growth,
            label
        ])

    return np.array(data)


# =========================
# MODEL TRAIN (ONE TIME)
# =========================
def train_model():
    data = generate_synthetic_data()

    X = data[:, :-1]
    y = data[:, -1]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = LogisticRegression(max_iter=1000)
    model.fit(X_train, y_train)

    joblib.dump(model, MODEL_PATH)
    return model


# =========================
# LOAD MODEL (FAST CACHE)
# =========================
def get_model():
    global _model_cache

    if _model_cache is not None:
        if hasattr(_model_cache, "n_features_in_") and _model_cache.n_features_in_ != 7:
            _model_cache = train_model()
        return _model_cache

    if os.path.exists(MODEL_PATH):
        try:
            _model_cache = joblib.load(MODEL_PATH)
            if hasattr(_model_cache, "n_features_in_") and _model_cache.n_features_in_ != 7:
                _model_cache = train_model()
        except Exception:
            _model_cache = train_model()
    else:
        _model_cache = train_model()

    return _model_cache


# =========================
# MAIN PREDICTION
# =========================
def predict(student_data):
    try:
        model = get_model()

        name = student_data.get("name", "Student")
        marks_list = student_data.get("marks", [])
        attendance = student_data.get("attendanceRate", 0)
        cgpa_trend = student_data.get("cgpaTrend", [])
        problem_subjects = student_data.get("problemSubjects", [])

        study_hours = student_data.get("studyHoursPerWeek", 0)
        assignment = student_data.get("assignmentCompletionRate", 0)
        backlogs = student_data.get("backlogs", 0)

        avg_marks = (
            sum(m.get("marks", 0) for m in marks_list) / len(marks_list)
            if marks_list else 0
        )

        # HEURISTIC: Handle "Fresh Start" students (e.g., Semester 1)
        # If no previous CGPA or growth, estimate from current marks.
        if latest_cgpa == 0:
            latest_cgpa = avg_marks / 10
            # CGPA is always capped at 10.0
            latest_cgpa = min(10.0, latest_cgpa)

        features = np.array([[
            attendance,
            avg_marks,
            latest_cgpa,
            study_hours,
            assignment,
            backlogs,
            cgpa_growth
        ]])

        pred = int(model.predict(features)[0])
        probs = model.predict_proba(features)[0]
        confidence = float(np.max(probs) * 100)

        labels = ["At Risk", "Needs Improvement", "Good", "Excellent"]
        prediction = labels[pred]

        # =========================
        # PERFORMANCE SCORE
        # =========================
        performance_score = (
            (attendance * 0.2) +
            (avg_marks * 0.3) +
            (latest_cgpa * 10 * 0.4)
        )

        # =========================
        # RISK FLAGS
        # =========================
        risk_flags = []

        if attendance < 50:
            risk_flags.append("Low Attendance")
        if avg_marks < 40:
            risk_flags.append("Low Marks")
        if latest_cgpa < 5:
            risk_flags.append("Critical CGPA")
        if backlogs > 2:
            risk_flags.append("Multiple Backlogs")

        # =========================
        # FUTURE PREDICTION
        # =========================
        predicted_cgpa = latest_cgpa + (cgpa_growth * 0.5)

        # =========================
        # SUBJECT INSIGHTS
        # =========================
        insights = []
        for m in marks_list:
            subject = m.get("subject", "Unknown")
            marks = m.get("marks", 0)

            if marks < (avg_marks - 10) or subject in problem_subjects:
                status = "Weak"
                advice = f"Focus more on {subject}, improve fundamentals."
            else:
                status = "Strong"
                advice = f"Good performance in {subject}, keep it up."

            insights.append({
                "subject": subject,
                "status": status,
                "advice": advice
            })

        # ENHANCED MESSAGE GENERATION (More "Advisor" like)
        msg_parts = [f"Analysis for {name}: {prediction} standing."]
        if risk_flags:
            msg_parts.append(f"Critical focus needed on {', '.join(risk_flags)}.")
        
        if confidence > 90:
            msg_parts.append("Prediction confidence is very high.")
        
        msg_parts.append(f"Based on CGPA trends, we forecast a potential shift to {round(predicted_cgpa, 2)} CGPA in the upcoming term.")
        
        message = " ".join(msg_parts)

        return {
            "prediction": prediction,
            "confidence": round(confidence, 2),
            "performanceScore": round(performance_score, 2),
            "riskFlags": risk_flags,
            "futurePrediction": {
                "expectedCGPA": round(predicted_cgpa, 2)
            },
            "insights": insights,
            "message": message
        }

    except Exception as e:
        return {"error": str(e)}


# =========================
# CLI SUPPORT
# =========================
if __name__ == "__main__":
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()

    if not raw:
        print(json.dumps({"error": "No input"}))
        sys.exit(1)

    try:
        data = json.loads(raw)
        result = predict(data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))