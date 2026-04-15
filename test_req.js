async function test() {
  try {
    const response = await fetch('http://localhost:3000/api/tasks/add-task', {
      method: 'POST',
      body: JSON.stringify({
        "customerName": "شحاده حسين شحاده طرخان",
        "contactNumber": "796844709",
        "requestNumber": "34462646",
        "operation": "New Network Access",
        "slid": "INT0803366",
        "tarrifName": "FTTP Digital 600",
        "customerFeedback": "لانه فقط مشان المحامي",
        "dashboardShortNote": "",
        "contractDate": "",
        "feDate": "",
        "inDate": "",
        "closeDate": "2026-04-01",
        "pisDate": "2026-04-01",
        "interviewDate": "2026-04-05",
        "governorate": "عمَان",
        "district": "سحاب / المدينة الصناعية",
        "assignedTo": [
          "67ab4cbc8b3293fde0fa364a"
        ],
        "whomItMayConcern": [
          "6814d5c3a7466564e94113a9"
        ],
        "priority": "High",
        "teamCompany": "Reach",
        "teamName": "شادي باسم عبد الجواد الصالحي",
        "teamId": "697f461379ac221977795086",
        "evaluationScore": "6",
        "customerType": "EBU",
        "validationStatus": "Not specified",
        "responsible": [
          "Not specified"
        ],
        "reason": [
          "Other"
        ],
        "subReason": [
          "Other"
        ],
        "rootCause": [
          "Not specified"
        ],
        "itnRelated": [
          "Not specified"
        ],
        "relatedToSubscription": [
          "Not specified"
        ],
        "ontType": "Not specified",
        "freeExtender": "Not specified",
        "extenderType": null,
        "extenderNumber": 0,
        "closureCallEvaluation": "",
        "closureCallFeedback": "",
        "gaiaCheck": "Not specified",
        "gaiaContent": null,
        "isQoS": false,
        "scoringKeys": [
          "det_nonITN_scoreEducation"
        ]
      }),
      headers: {
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3YWI0Y2JjOGIzMjkzZmRlMGZhMzY0YSIsInJvbGUiOiJBZG1pbiIsImlhdCI6MTc3NTcxNjEyNiwiZXhwIjoxNzc1NzU5MzI2fQ.SIdvAZC_XUEHaKaCuYSFwIokI8VWIbm0AxYfKCEk360"
      }
    });
    
    if (!response.ok) {
        console.error("Status:", response.status);
        console.error("Data:", await response.json());
    } else {
        console.log("Success:", await response.json());
    }
  } catch (err) {
    console.error(err.message);
  }
}

test();
