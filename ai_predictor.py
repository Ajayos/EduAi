import os
import sys
import json
import random

def get_internal_prediction(student_data):
    """
    Internal AI-based prediction logic using data heuristics.
    Simulates an LLM analysis but runs locally.
    """
    try:
        name = student_data.get("name", "Student")
        marks_list = student_data.get("marks", [])
        attendance_rate = student_data.get("attendanceRate", 0)
        cgpa_trend = student_data.get("cgpaTrend", [])
        problem_subjects = student_data.get("problemSubjects", [])
        
        # Calculate base metrics
        avg_marks = sum(m.get("marks", 0) for m in marks_list) / len(marks_list) if marks_list else 0
        latest_cgpa = cgpa_trend[-1].get("cgpa", 0) if cgpa_trend else 0
        
        # Internal Heuristic formula for Performance Score
        perf_score = (latest_cgpa * 10 * 0.4) + (attendance_rate * 0.2) + (avg_marks * 0.3) + 7
        
        # Determine Prediction Category
        if perf_score >= 85:
            prediction = "Excellent"
            summary = f"{name} is demonstrating exceptional academic prowess with a score of {perf_score:.1f}%. High engagement levels detected."
            recommendation = "Maintain current momentum. Focus on peer mentoring and elective specializations."
        elif perf_score >= 70:
            prediction = "Good"
            summary = f"{name} is performing well with consistent results. Areas for minor refinement identified."
            recommendation = "Strengthen weak modules. Increase class participation to reach top-tier metrics."
        elif perf_score >= 50:
            prediction = "Needs Improvement"
            summary = f"{name} is at a transitional phase. Current metrics suggest inconsistent study habits."
            recommendation = "Establish a strict study timetable. Focus on core conceptual clarity in weak subjects."
        else:
            prediction = "At Risk"
            summary = f"Critical Alert: {name}'s performance metrics are below safe thresholds. Immediate intervention required."
            recommendation = "Mandatory remedial sessions. Weekly progress monitoring with faculty advisor."

        # Subject Insights
        insights = []
        for m in marks_list:
            subject_name = m.get("subject", "Unknown")
            subject_marks = m.get("marks", 0)
            
            if subject_marks < 50 or subject_name in problem_subjects:
                status = "Weak"
                advice = random.choice([
                    f"Prioritize foundational revision for {subject_name}.",
                    f"Allocate extra 45 mins daily for {subject_name} practice.",
                    f"Review previous year question patterns for {subject_name}."
                ])
            else:
                status = "Strong"
                advice = random.choice([
                    f"Excellent grasp of {subject_name} concepts.",
                    f"Ready for advanced topics in {subject_name}.",
                    f"Maintain consistency in {subject_name} assignments."
                ])
            
            insights.append({
                "subject": subject_name,
                "status": status,
                "advice": advice
            })

        return {
          "prediction": prediction,
          "performanceScore": round(perf_score, 1),
          "recommendation": recommendation,
          "insights": insights,
          "overallSummary": summary
        }
    except Exception as e:
        return {"error": f"Internal Predictor Error: {str(e)}"}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        raw_input = sys.argv[1]
    else:
        raw_input = sys.stdin.read()
        
    if not raw_input:
        print(json.dumps({"error": "No input data provided"}))
        sys.exit(1)
        
    try:
        input_data = json.loads(raw_input)
        result = get_internal_prediction(input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": "Invalid JSON input: " + str(e)}))
