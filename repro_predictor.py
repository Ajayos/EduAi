import json
import sys
from ai_predictor import predict

test_data = {
    "name": "Student",
    "marks": [{"subject": "Math", "marks": 65}],
    "attendanceRate": 100,
    "cgpaTrend": [],
    "problemSubjects": [],
    "assignmentCompletionRate": 100,
    "backlogs": 0,
    "studyHoursPerWeek": 15
}

result = predict(test_data)
print(json.dumps(result, indent=2))
