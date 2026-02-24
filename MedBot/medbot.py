import json
from router import AdaptiveMedicalBot

def collect_demographics(bot):
    """
    Runs the pre-triage interview to fill the patient file.
    """
    print("Bot: Hello. I am the Intake Coordinator. I need to update your file before we begin.")

    # 1. NAME
    while not bot.patient_info["name"]:
        user_input = input("Bot: What is your full name?\nYou: ").strip()
        if len(user_input) > 0:
            bot.patient_info["name"] = user_input.title()
        else:
            print("Bot: Please enter a valid name.")

    # 2. AGE
    while not bot.patient_info["age"]:
        user_input = input(f"Bot: Thank you, {bot.patient_info['name']}. How old are you?\nYou: ").strip()
        if user_input.isdigit() and 0 < int(user_input) < 120:
            bot.patient_info["age"] = user_input
        else:
            print("Bot: Please enter your age as a number (e.g., 45).")

    # 3. BIOLOGICAL SEX (Needed for medical risk factors)
    while not bot.patient_info["gender"]:
        user_input = input("Bot: What is your biological sex? (Male/Female/Other)\nYou: ").strip().lower()
        if user_input in ['male', 'm']:
            bot.patient_info["gender"] = "Male"
        elif user_input in ['female', 'f']:
            bot.patient_info["gender"] = "Female"
        elif 'other' in user_input:
             bot.patient_info["gender"] = "Other"
        else:
            print("Bot: Please specify Male, Female, or Other.")

    print(f"[SYSTEM] Patient Registered: {bot.patient_info['name']} ({bot.patient_info['age']}/{bot.patient_info['gender']})")
    print("-" * 40)

def save_report_to_disk(bot):
    """Helper function to generate and save the JSON report."""
    print("\n[SYSTEM] Generating final medical record...")
    
    # Generate JSON from LLM
    json_str = bot.generate_final_report()
    
    try:
        # Parse and Save
        report_data = json.loads(json_str)
        filename = f"{bot.patient_info['name'].replace(' ', '_')}_Report.json"
        
        with open(filename, "w") as f:
            json.dump(report_data, f, indent=4)
            
        print(f"✅ Report successfully saved to: {filename}")
        
    except json.JSONDecodeError:
        print("❌ Error: The bot failed to produce valid JSON.")
        print("Raw Output:", json_str)

def main():
    bot = AdaptiveMedicalBot()
    
    print("--- AI HOSPITAL INTAKE SYSTEM ---")
    
    # Phase 1: Collect Info
    collect_demographics(bot)

    # Phase 2: Inject Context (Primes the LLM with age/gender)
    bot.inject_patient_profile()

    # Phase 3: Medical Triage
    print("Bot: Now, please tell me in a few words: what brings you in today?")

    while True:
        user_input = input("You: ")
        
        # --- MANUAL EXIT ---
        if user_input.lower() in ["quit", "exit", "done"]:
            save_report_to_disk(bot)
            print("Status: Session Ended Manually")
            break
        
        # --- PROCESSING INPUT ---
        response = bot.process_input(user_input)
        
        # 1. CHECK FOR URGENCY
        if "URGENT" in response or "RED_FLAG" in response:
             print(f"\nURGENT: {response}")
             print("!!! PLEASE CALL EMERGENCY SERVICES !!!")
             break

        # 2. CHECK FOR COMPLETION (Auto-Stop)
        if "[COMPLETE]" in response:
            # Remove the tag from the final message
            clean_response = response.replace(" [COMPLETE]", "")
            print(f"Bot [{bot.current_specialist}]: {clean_response}")
            
            print("\n[SYSTEM] Sufficient clinical data collected.")
            save_report_to_disk(bot)
            break
             
        # 3. NORMAL RESPONSE
        print(f"Bot [{bot.current_specialist}]: {response}")

if __name__ == "__main__":
    main()