# router.py
import google.generativeai as genai
import os
import time
from specific_protocols import SPECIALIST_PROMPTS
from dotenv import load_dotenv

# Load API keys
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL") 
genai.configure(api_key=api_key, transport="rest")

class AdaptiveMedicalBot:
    def __init__(self):
        self.patient_info = {
            "name": None,
            "age": None,
            "gender": None 
        }
        self.current_specialist = "GENERAL"
        
        # --- SAFETY SETTINGS ---
        from google.generativeai.types import HarmCategory, HarmBlockThreshold
        self.safety_settings = {
            HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
            HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        }

        try:
            self.model = genai.GenerativeModel(
                model_name=model_name,
                safety_settings=self.safety_settings
            )
        except Exception as e:
            print(f"Error initializing model. Check your .env file. Error: {e}")
        
        self.chat = self.model.start_chat(history=[
            {"role": "user", "parts": ["SYSTEM START: " + SPECIALIST_PROMPTS["GENERAL"]]},
            {"role": "model", "parts": ["Understood. I am ready to triage."]}
        ])

    def _get_history_text(self):
        """Helper to convert complex chat objects into simple text."""
        transcript = []
        for msg in self.chat.history:
            role = "User" if msg.role == "user" else "Bot"
            if msg.parts:
                transcript.append(f"{role}: {msg.parts[0].text}")
        return "\n".join(transcript)

    def inject_patient_profile(self):
        profile_msg = f"""
        SYSTEM UPDATE: PATIENT PROFILE LOADED.
        Name: {self.patient_info['name']}
        Age: {self.patient_info['age']}
        Biological Sex: {self.patient_info['gender']}
        """
        self.chat.send_message(profile_msg)
        print(f"[SYSTEM] Context Loaded: {self.patient_info['age']}y {self.patient_info['gender']}")

    def generate_handover_summary(self, user_input):
        summary_prompt = f"""
        TASK: Summarize the following patient complaint into one medical sentence.
        INPUT: "{user_input}"
        OUTPUT FORMAT: "Patient reports [symptoms] with [duration/severity]."
        """
        try:
            response = self.model.generate_content(summary_prompt)
            return response.text.strip()
        except:
            return f"Patient reports: {user_input}"

    def update_specialist(self, new_specialist, user_text):
        print(f"\n[SYSTEM] Switching Protocol: {self.current_specialist} -> {new_specialist}")
        handover_data = self.generate_handover_summary(user_text)
        
        handover_instruction = f"""
        !!! SYSTEM ALERT: PROTOCOL SWITCH !!!
        NEW ROLE: {new_specialist}
        INSTRUCTIONS: {SPECIALIST_PROMPTS[new_specialist]}
        PATIENT CONTEXT: {self.patient_info['age']} year old {self.patient_info['gender']}.
        HANDOVER DATA: {handover_data}
        ACTION: valid_response = "I see you are experiencing {handover_data}. Let's check that."
        Start your examination now based on this data.
        """
        self.chat.send_message(handover_instruction)
        self.current_specialist = new_specialist

    def router_check(self, user_text):
        router_prompt = f"""
        Analyze this input: "{user_text}"
        Current Dept: {self.current_specialist}
        Available Depts: [CARDIOLOGY, GASTRO, RESPIRATORY, NEUROLOGY, ORTHOPEDICS, GENERAL]
        Rules: Output ONLY the department name or MAINTAIN.
        """
        try:
            response = self.model.generate_content(router_prompt)
            decision = response.text.strip().upper()
            for dept in SPECIALIST_PROMPTS.keys():
                if dept in decision:
                    return dept
            return "MAINTAIN"
        except:
            return "MAINTAIN"

    def check_sufficiency(self):
        # FIX: Send text, not the list object
        history_text = self._get_history_text()
        
        check_prompt = f"""
        TRANSCRIPT:
        {history_text}
        TASK: Do we have ALL 4 data points?
        1. Chief Complaint
        2. Onset/Duration
        3. Severity
        4. Associated Symptoms
        Output 'YES' only if all 4 are present. Otherwise 'NO'.
        """
        try:
            response = self.model.generate_content(check_prompt)
            if "YES" in response.text.strip().upper():
                return True
        except:
            return False
        return False

    def generate_final_report(self):
        print("\n[SYSTEM] Compiling final medical report...")
        history_text = self._get_history_text()
        
        report_prompt = f"""
        TRANSCRIPT:
        {history_text}
        TASK: Generate a final JSON SOAP note.
        schema = {{
            "patient_id": "auto-generated",
            "demographics": {{
                "name": "{self.patient_info['name']}",
                "age": "{self.patient_info['age']}",
                "gender": "{self.patient_info['gender']}"
            }},
            "subjective": {{
                "chief_complaint": "string",
                "history_of_present_illness": "string",
                "symptoms_list": ["list"],
                "risk_factors_identified": ["list"]
            }},
            "triage_assessment": {{
                "primary_specialty_consulted": "{self.current_specialist}",
                "urgency_level": "Routine/Urgent/Emergency"
            }}
        }}
        OUTPUT ONLY THE JSON OBJECT.
        """
        try:
            response = self.model.generate_content(
                report_prompt, 
                generation_config={"response_mime_type": "application/json"}
            )
            return response.text
        except Exception as e:
            return f'{{"error": "Failed to generate report: {str(e)}"}}'

    def process_input(self, user_text):
        # FIX: Add delays to prevent 429 Rate Limit errors
        
        # 1. Router Check
        suggested_specialist = self.router_check(user_text)
        time.sleep(1) # PAUSE 1 SECOND
        
        if suggested_specialist != "MAINTAIN" and suggested_specialist != self.current_specialist:
            self.update_specialist(suggested_specialist, user_text)
            time.sleep(1) # PAUSE 1 SECOND
            
        # 2. Generate Response
        try:
            response = self.chat.send_message(user_text)
            if not response.parts:
                return "I cannot process that specific phrasing due to safety guidelines."
            bot_reply = response.text
            
            time.sleep(1) # PAUSE 1 SECOND
            
            # 3. Auto-Stop Check (Only check every 2 turns to save quota)
            if len(self.chat.history) > 6 and len(self.chat.history) % 2 == 0: 
                if self.check_sufficiency():
                    return bot_reply + " [COMPLETE]"
                    
            return bot_reply

        except Exception as e:
            if "429" in str(e):
                return "System Busy: Please wait 5 seconds and try again."
            return f"System Error: {str(e)}"