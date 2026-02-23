
import React, { useState, useCallback } from 'react';
import {
  LuUpload as Upload,
  LuFileJson as FileJson,
  LuFileText as FileText,
  LuClipboard as Clipboard,
  LuCircleCheck as CheckCircle2,
  LuUser as User,
  LuStethoscope as Stethoscope,
  LuHistory as History,
  LuCircleAlert as AlertCircle,
  LuClock as Clock,
  LuActivity as Activity,
  LuDownload as Download,
  LuX
} from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import { cleanMedicalChat } from './utils/cleaner';

function App() {
  const [rawData, setRawData] = useState(null);
  const [cleanedData, setCleanedData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setRawData(json);
        const cleaned = cleanMedicalChat(json);
        setCleanedData(cleaned);
      } catch (err) {
        alert("Invalid JSON file. Please upload a structured medical chat JSON.");
      }
    };
    reader.readAsText(file);
  };

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/json") {
      readFile(file);
    }
  }, []);

  const copyToClipboard = () => {
    const text = `
Medical Report Summary
---------------------
  Name: ${cleanedData.patientInfo.name}
Age: ${cleanedData.patientInfo.age}
Gender: ${cleanedData.patientInfo.gender}

Primary Complaint: ${cleanedData.medicalContext.primaryComplaint}
Symptoms: ${cleanedData.medicalContext.symptoms.join(', ')}
Duration: ${cleanedData.medicalContext.duration}
Severity: ${cleanedData.medicalContext.severity}

Medical history: ${cleanedData.history.pastConditions.length > 0 ? cleanedData.history.pastConditions.join(', ') : 'None mentioned'}
`.trim();

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="app-container">
      <header>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          MedClean AI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Professional Medical Chat Log Purifier & Extraction Tool
        </motion.p>
      </header>

      <div className="main-content">
        <aside className="upload-section">
          <h3>Upload Chat Log</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>
            Supports JSON files from most telehealth platforms.
          </p>

          <div
            className={`drop - zone ${isDragging ? 'active' : ''} `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <Upload size={48} />
            <p>{rawData ? 'File Uploaded!' : 'Click or Drag & Drop JSON file'}</p>
            <input
              id="file-upload"
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button className="btn-primary" onClick={() => document.getElementById('file-upload').click()}>
              Browse Files
            </button>
            {rawData && (
              <button className="btn-outline" onClick={() => { setRawData(null); setCleanedData(null); }}>
                Clear Data
              </button>
            )}
          </div>
        </aside>

        <main className="results-section">
          <AnimatePresence mode="wait">
            {!cleanedData ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="empty-state"
              >
                <FileJson size={64} />
                <h2>No Data Processed</h2>
                <p>Upload a JSON chat log to generate a cleaned medical summary.</p>
              </motion.div>
            ) : (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Patient Summary Card */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={20} color="var(--primary)" />
                      <h3>Patient Demographics</h3>
                    </div>
                    <span className="badge badge-blue">Verified Extraction</span>
                  </div>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Patient Name</label>
                      <span>{cleanedData.patientInfo.name}</span>
                    </div>
                    <div className="info-item">
                      <label>Age</label>
                      <span>{cleanedData.patientInfo.age}</span>
                    </div>
                    <div className="info-item">
                      <label>Gender</label>
                      <span style={{ textTransform: 'capitalize' }}>{cleanedData.patientInfo.gender}</span>
                    </div>
                  </div>
                </div>

                {/* Medical Analysis Card */}
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Stethoscope size={20} color="var(--primary)" />
                      <h3>Clinical Summary</h3>
                    </div>
                    <span className="badge badge-green">AI Processed</span>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Primary Complaint</label>
                    <p style={{ fontSize: '1.1rem', fontWeight: 500, marginTop: '0.25rem' }}>
                      {cleanedData.medicalContext.primaryComplaint}
                    </p>
                  </div>

                  <div className="info-grid">
                    <div className="info-item">
                      <label><Clock size={14} style={{ marginRight: 4 }} /> Duration</label>
                      <span>{cleanedData.medicalContext.duration}</span>
                    </div>
                    <div className="info-item">
                      <label><Activity size={14} style={{ marginRight: 4 }} /> Severity</label>
                      <span>{cleanedData.medicalContext.severity} / 10</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Detected Symptoms</label>
                    <div className="list-tags">
                      {cleanedData.medicalContext.symptoms.length > 0 ? (
                        cleanedData.medicalContext.symptoms.map(s => (
                          <span key={s} className="tag" style={{ textTransform: 'capitalize' }}>{s}</span>
                        ))
                      ) : (
                        <span className="text-muted">No specific symptoms extracted</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Assessment & Problem List (SOAP specific) */}
                {cleanedData.assessment.preliminary !== 'Unknown' && (
                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={20} color="var(--primary)" />
                        <h3>Assessment & Diagnosis</h3>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Preliminary Assessment</label>
                      <p style={{ fontSize: '0.95rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
                        {cleanedData.assessment.preliminary}
                      </p>

                      {cleanedData.assessment.problemList.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                          <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Problem List</label>
                          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.95rem' }}>
                            {cleanedData.assessment.problemList.map((prob, i) => (
                              <li key={i} style={{ marginBottom: '0.5rem' }}>{prob}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Implementation Plan (SOAP specific) */}
                {cleanedData.plan.recommendations.length > 0 && (
                  <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle2 size={20} color="var(--success)" />
                        <h3>Clinical Plan</h3>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>Recommendations</label>
                      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.2rem', fontSize: '0.95rem' }}>
                        {cleanedData.plan.recommendations.map((rec, i) => (
                          <li key={i} style={{ marginBottom: '0.5rem' }}>{rec}</li>
                        ))}
                      </ul>

                      {cleanedData.plan.education !== 'Unknown' && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', borderLeft: '4px solid #0ea5e9' }}>
                          <label style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 700, textTransform: 'uppercase' }}>Patient Education</label>
                          <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{cleanedData.plan.education}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {/* Patient History Card */}
                <div className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <History size={20} color="var(--primary)" />
                      <h3>History & Context</h3>
                    </div>
                  </div>
                  <div className="info-grid">
                    <div className="info-item">
                      <label>Reported History</label>
                      <p style={{ fontSize: '0.9rem' }}>
                        {cleanedData.history.pastConditions.length > 0
                          ? cleanedData.history.pastConditions.join(', ')
                          : 'No significant past medical history mentioned in chat segment.'}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                    <button className="btn-primary" onClick={copyToClipboard} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {copySuccess ? <CheckCircle2 size={18} /> : <Clipboard size={18} />}
                      {copySuccess ? 'Copied!' : 'Copy Summary'}
                    </button>
                    <button className="btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Download size={18} />
                      Export PDF
                    </button>
                  </div>
                </div>

                {/* Raw Inspector */}
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <AlertCircle size={16} color="#64748b" />
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Raw JSON Source Inspection</span>
                  </div>
                  <pre className="raw-output">
                    {JSON.stringify(rawData, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
