Minimal IVR fields (no PHI)

- Caller type: SNF nurse / Provider / Patient / Other
- Facility/site name
- Callback number
- Wound type: DFU/VLU/Pressure/Surgical/Trauma/Other
- Red flags: fever, spreading erythema, uncontrolled bleeding, severe pain
- Request type: Consult / Supplies / Graft inquiry / Training / Billing
- Priority: Routine/Urgent

Routing

- If any red flags -> Priority=Urgent -> AssignedTo "Clinical Triage"
- If requestType=Training -> AssignedTo "Education"
- If requestType=Billing -> AssignedTo "Revenue Cycle"
- Else -> AssignedTo "Wound Navigator"
