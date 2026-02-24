# api/index.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

# Add the parent directory to sys.path so we can import MedBot modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Import from the MedBot subdirectory
try:
    from MedBot.router import AdaptiveMedicalBot
except ImportError:
    # Fallback if structure is different on certain environments
    from router import AdaptiveMedicalBot

app = Flask(__name__)
CORS(app)

# Store active sessions in memory (for demonstration; use Redis for production)
sessions = {}

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model": os.getenv("GEMINI_MODEL", "not_set")})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_id = data.get('user_id', 'default_user')
    user_input = data.get('message', '')
    
    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    # Initialize bot for session if not exists
    if user_id not in sessions:
        bot = AdaptiveMedicalBot()
        # Pre-fill some info or wait for greeting
        sessions[user_id] = bot
    
    bot = sessions[user_id]
    
    try:
        response = bot.process_input(user_input)
        
        # Check for completion
        is_complete = "[COMPLETE]" in response
        clean_response = response.replace(" [COMPLETE]", "")
        
        result = {
            "response": clean_response,
            "specialist": bot.current_specialist,
            "is_complete": is_complete
        }
        
        if is_complete:
            # Generate final report if complete
            result["report"] = bot.generate_final_report()
            # Optionally clear session
            # del sessions[user_id]
            
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/init', methods=['POST'])
def init_patient():
    data = request.json
    user_id = data.get('user_id', 'default_user')
    name = data.get('name')
    age = data.get('age')
    gender = data.get('gender')
    
    bot = AdaptiveMedicalBot()
    bot.patient_info['name'] = name
    bot.patient_info['age'] = age
    bot.patient_info['gender'] = gender
    
    bot.inject_patient_profile()
    sessions[user_id] = bot
    
    return jsonify({"status": "initialized", "user_id": user_id})

# For local development
if __name__ == '__main__':
    app.run(debug=True)
