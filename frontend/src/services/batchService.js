const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export const batchService = {
  // Get all batches for a specific date and type
  async getBatches(date, dayType, batchType) {
    const response = await fetch(`${API_BASE}/api/batches?date=${date}&dayType=${dayType}&batchType=${batchType}`);
    if (!response.ok) {
      throw new Error('Failed to fetch batches');
    }
    return response.json();
  },

  // Create a new batch
  async createBatch(batchData) {
    const response = await fetch(`${API_BASE}/api/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(batchData)
    });
    if (!response.ok) {
      throw new Error('Failed to create batch');
    }
    return response.json();
  },

  // Add student to a batch
  async addStudent(batchId, studentData) {
    const response = await fetch(`${API_BASE}/api/batches/${batchId}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(studentData)
    });
    if (!response.ok) {
      throw new Error('Failed to add student');
    }
    return response.json();
  },

  // Get all students in a batch
  async getBatchStudents(batchId) {
    const response = await fetch(`${API_BASE}/api/batches/${batchId}/students`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch batch students');
    }
    return response.json();
  }
};
