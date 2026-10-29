import axios from 'axios';
import {
  runClientSideAnalysis,
  getStoredAnalyses,
  getStoredSkillsCatalog,
  getClientModelEvaluation
} from './clientEngine';

// Default to backend API if available
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api/v1'
  : '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Health
  checkHealth: async () => {
    try {
      return await axios.get('http://localhost:8000/health', { timeout: 1500 });
    } catch (e) {
      return { data: { status: 'offline_client_mode' } };
    }
  },

  // Resumes
  uploadResume: async (formData) => {
    try {
      return await apiClient.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (err) {
      console.warn("Backend resume upload unavailable, using client-side parsed document.");
      throw err;
    }
  },

  // Jobs
  getSavedJobs: async () => {
    try {
      return await apiClient.get('/jobs');
    } catch (err) {
      const stored = localStorage.getItem('saved_jobs');
      return { data: stored ? JSON.parse(stored) : [] };
    }
  },

  saveJob: async (jobData) => {
    try {
      return await apiClient.post('/jobs', jobData);
    } catch (err) {
      const stored = JSON.parse(localStorage.getItem('saved_jobs') || '[]');
      stored.unshift({ ...jobData, id: Date.now() });
      localStorage.setItem('saved_jobs', JSON.stringify(stored));
      return { data: jobData };
    }
  },

  // Analysis
  runAnalysis: async (payload) => {
    try {
      return await apiClient.post('/analyze', payload);
    } catch (err) {
      console.warn("Backend unavailable, executing in-browser NLP/TF-IDF pipeline:", err.message);
      // Run complete ML pipeline in browser
      const result = runClientSideAnalysis({
        resume_text: payload.resume_text,
        job_text: payload.job_text,
        job_title: payload.job_title,
        company_name: payload.company_name
      });
      return { data: result };
    }
  },

  getAnalyses: async () => {
    try {
      const res = await apiClient.get('/analyses');
      if (res.data && res.data.length > 0) return res;
      throw new Error("No backend analyses");
    } catch (err) {
      return { data: getStoredAnalyses() };
    }
  },

  getAnalysisById: async (id) => {
    try {
      return await apiClient.get(`/analyses/${id}`);
    } catch (err) {
      const all = getStoredAnalyses();
      const found = all.find((a) => a.id === id || String(a.id) === String(id));
      return { data: found || all[0] };
    }
  },

  deleteAnalysis: async (id) => {
    try {
      await apiClient.delete(`/analyses/${id}`);
    } catch (err) {
      console.warn("Deleting from local storage");
    }
    const all = getStoredAnalyses().filter((a) => a.id !== id && String(a.id) !== String(id));
    localStorage.setItem('analysis_history', JSON.stringify(all));
    return { data: { success: true } };
  },

  // Skills
  getSkillsCatalog: async () => {
    try {
      const res = await apiClient.get('/skills');
      if (res.data && res.data.categories) return res;
      throw new Error("No backend catalog");
    } catch (err) {
      return { data: getStoredSkillsCatalog() };
    }
  },

  addCustomSkill: async (skillData) => {
    try {
      await apiClient.post('/skills', skillData);
    } catch (err) {
      console.warn("Saving custom skill to localStorage");
    }
    const custom = JSON.parse(localStorage.getItem('custom_skills') || '[]');
    custom.push(skillData);
    localStorage.setItem('custom_skills', JSON.stringify(custom));
    return { data: skillData };
  },

  // Learning Checklist
  getChecklist: async (analysisId) => {
    try {
      return await apiClient.get(`/learning-checklist/${analysisId}`);
    } catch (err) {
      const all = getStoredAnalyses();
      const match = all.find((a) => a.id === analysisId || String(a.id) === String(analysisId));
      return { data: match?.learning_checklist || [] };
    }
  },

  updateChecklistItemStatus: async (itemId, status) => {
    try {
      await apiClient.patch(`/learning-checklist/${itemId}`, { status });
    } catch (err) {
      console.warn("Updating checklist status in local storage");
    }
    const all = getStoredAnalyses();
    all.forEach((analysis) => {
      if (analysis.learning_checklist) {
        analysis.learning_checklist.forEach((item) => {
          if (item.id === itemId || item.item_id === itemId) {
            item.status = status;
          }
        });
      }
    });
    localStorage.setItem('analysis_history', JSON.stringify(all));
    return { data: { success: true, status } };
  },

  // Evaluation
  getModelEvaluation: async () => {
    try {
      const res = await apiClient.get('/evaluation');
      if (res.data && res.data.overall_skill_extraction_metrics) return res;
      throw new Error("No backend evaluation");
    } catch (err) {
      return { data: getClientModelEvaluation() };
    }
  },
};
