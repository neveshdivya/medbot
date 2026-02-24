/**
 * Medical Chat Cleaner Utility
 * Extracts structured medical data from raw chatbot-patient transcripts.
 */

export const cleanMedicalChat = (rawJson) => {
    try {
        let data = typeof rawJson === 'string' ? JSON.parse(rawJson) : rawJson;

        // Detection Logic
        // Detection Logic
        const soapData = data.SOAP_note || data.SOAP_Note; // Handle both cases
        const isSoapNote = !!soapData;
        const messages = Array.isArray(data) ? data : (data.messages || data.chat || []);

        const result = {
            patientInfo: {
                name: 'Unknown',
                age: 'Unknown',
                gender: 'Unknown',
            },
            medicalContext: {
                primaryComplaint: 'Unknown',
                symptoms: [],
                duration: 'Unknown',
                severity: 'Unknown',
            },
            history: {
                pastConditions: [],
                medications: [],
                allergies: [],
            },
            assessment: {
                preliminary: 'Unknown',
                problemList: []
            },
            plan: {
                recommendations: [],
                education: 'Unknown'
            },
            chatStats: {
                totalMessages: isSoapNote ? 0 : messages.length,
                format: isSoapNote ? 'SOAP Note' : 'Chat Transcript'
            }
        };

        if (isSoapNote) {
            // Helper to get nested properties safely, checking both full names and abbreviations
            const getSection = (key, altKey) => soapData[key] || soapData[altKey] || {};

            const S = getSection('Subjective', 'S');
            const O = getSection('Objective', 'O');
            const A = getSection('Assessment', 'A');
            const P = getSection('Plan', 'P');

            // --- Subjective (S) ---
            result.medicalContext.primaryComplaint = S.Chief_Complaint || S.chief_complaint || 'Unknown';

            // History of Present Illness (HPI)
            const hpi = S.History_of_Present_Illness || S.history_of_present_illness;
            let combinedHPIText = '';
            if (hpi) {
                if (Array.isArray(hpi)) {
                    // Start of extracting duration/context from text array
                    combinedHPIText = hpi.join(' ');
                } else if (typeof hpi === 'object') {
                    combinedHPIText = JSON.stringify(hpi);
                    result.medicalContext.duration = hpi.onset_duration_severity || result.medicalContext.duration;
                    if (hpi.cough_details) result.medicalContext.symptoms.push(hpi.cough_details);
                    if (hpi.associated_symptoms) result.medicalContext.symptoms.push(hpi.associated_symptoms);
                } else if (typeof hpi === 'string') {
                    combinedHPIText = hpi;
                }
            }

            // Attempt to extract Duration from HPI text if not found
            if (result.medicalContext.duration === 'Unknown' && combinedHPIText) {
                // Expanded duration patterns: "started this morning", "onset 2 days ago", "for 3 weeks"
                const durationMatch = combinedHPIText.match(/(?:started|onset|duration|for|since|last)\s*:?\s*((?:this\s+morning|yesterday|today|last\s+night|\d+\s*(?:day|week|month|hour|minute)s?))/i);
                if (durationMatch) {
                    result.medicalContext.duration = durationMatch[1];
                }
            }

            // Attempt to extract Patient Demographics from HPI text (e.g., "Patient is a 45 year old male...")
            if (combinedHPIText) {
                const ageMatch = combinedHPIText.match(/(?:patient|pt|he|she)\s+is\s+(?:a|an)\s*(\d{1,2})(?:\s*-?\s*year\s*-?\s*old)/i) ||
                    combinedHPIText.match(/(\d{1,2})\s*years\s*old/i);
                if (ageMatch && result.patientInfo.age === 'Unknown') result.patientInfo.age = ageMatch[1];

                const genderMatch = combinedHPIText.match(/(male|female|man|woman|boy|girl)/i);
                if (genderMatch && result.patientInfo.gender === 'Unknown') result.patientInfo.gender = genderMatch[1];
            }

            // Extract Symptoms from Review of Systems or HPI text
            const ros = S.Review_of_Systems || S.review_of_systems;
            if (ros) {
                Object.values(ros).forEach(val => {
                    if (typeof val === 'string') {
                        // Simple extraction of keywords
                        const symptomKeywords = ['pain', 'cough', 'fever', 'headache', 'nausea', 'breath', 'rash', 'ache', 'sore', 'swelling', 'bruising', 'numbness', 'tingling', 'dizziness', 'fatigue'];
                        symptomKeywords.forEach(word => {
                            if (val.toLowerCase().includes(word) && !result.medicalContext.symptoms.includes(word)) {
                                result.medicalContext.symptoms.push(word);
                            }
                        });
                    }
                });
            }

            // Also scan HPI for symptoms
            if (combinedHPIText) {
                const symptomKeywords = ['pain', 'cough', 'fever', 'headache', 'nausea', 'breath', 'rash', 'ache', 'sore', 'swelling', 'bruising', 'numbness', 'tingling', 'dizziness', 'fatigue'];
                symptomKeywords.forEach(word => {
                    if (combinedHPIText.toLowerCase().includes(word) && !result.medicalContext.symptoms.includes(word)) {
                        result.medicalContext.symptoms.push(word);
                    }
                });
            }


            // Past Medical History
            const pmh = S.Past_Medical_History || S.past_medical_history;
            if (pmh) {
                if (Array.isArray(pmh)) result.history.pastConditions = pmh;
                else result.history.pastConditions.push(pmh);
            }

            // --- Objective (O) ---
            // (Might extract vitals here if needed in future)

            // --- Assessment (A) ---
            result.assessment.preliminary = A.Problem || A.preliminary_assessment || 'Unknown';
            // Problem List / Differential Diagnosis
            const diffDx = A.Differential_Diagnosis_Considerations || A.problem_list;
            if (diffDx) {
                if (Array.isArray(diffDx)) result.assessment.problemList = diffDx;
                else result.assessment.problemList.push(diffDx);
            }


            // --- Plan (P) ---
            // Recommendations / Interventions / Diagnostics
            const interventions = P.Interventions || P.recommendations;
            if (interventions) {
                if (Array.isArray(interventions)) result.plan.recommendations.push(...interventions);
                else result.plan.recommendations.push(interventions);
            }

            const diagnostics = P.Diagnostics_Needed;
            if (diagnostics) {
                if (Array.isArray(diagnostics)) result.plan.recommendations.push(...diagnostics); // Add diagnostics to recommendations for now
                else result.plan.recommendations.push(diagnostics);
            }

            result.plan.education = P.Patient_Education || P.education || 'Unknown';

            // Follow up
            if (P.Follow_up) {
                result.plan.recommendations.push(`Follow up: ${P.Follow_up}`);
            }

        } else {
            // Heuristic patterns for Chat Transcript
            const patterns = {
                name: /(?:my name is|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
                age: /(?:i am|age is|age:?)\s*(\d{1,2}(?:\s*years\s*old)?)/i,
                gender: /(male|female|other|man|woman)/i,
                severity: /(severity|pain|level|scale|of)\s*(?:is|:)?\s*(\d{1,2}|low|medium|high|severe)/i,
                duration: /(?:for|since|last)\s*(\d+\s*(?:day|week|month|hour)s?)/i,
            };

            messages.forEach((msg) => {
                const content = msg.content || msg.text || '';
                const lowerContent = content.toLowerCase();

                if (msg.role === 'user') {
                    const nameMatch = content.match(patterns.name);
                    if (nameMatch && result.patientInfo.name === 'Unknown') result.patientInfo.name = nameMatch[1];

                    const ageMatch = content.match(patterns.age);
                    if (ageMatch && result.patientInfo.age === 'Unknown') result.patientInfo.age = ageMatch[1];

                    const genderMatch = content.match(patterns.gender);
                    if (genderMatch && result.patientInfo.gender === 'Unknown') result.patientInfo.gender = genderMatch[1];

                    const severityMatch = lowerContent.match(patterns.severity);
                    if (severityMatch && result.medicalContext.severity === 'Unknown') result.medicalContext.severity = severityMatch[2];

                    const durationMatch = lowerContent.match(patterns.duration);
                    if (durationMatch && result.medicalContext.duration === 'Unknown') result.medicalContext.duration = durationMatch[1];

                    const symptomKeywords = ['pain', 'cough', 'fever', 'headache', 'nausea', 'breath', 'rash', 'ache', 'sore'];
                    symptomKeywords.forEach(word => {
                        if (lowerContent.includes(word) && !result.medicalContext.symptoms.includes(word)) {
                            result.medicalContext.symptoms.push(word);
                        }
                    });
                }

                if (msg.role === 'user' && result.medicalContext.primaryComplaint === 'Unknown') {
                    if (lowerContent.includes('feel') || lowerContent.includes('have a') || lowerContent.includes('experiencing')) {
                        result.medicalContext.primaryComplaint = content.length > 100 ? content.substring(0, 97) + '...' : content;
                    }
                }
            });
        }

        return result;
    } catch (error) {
        console.error("Cleaning Error:", error);
        return null;
    }
};

