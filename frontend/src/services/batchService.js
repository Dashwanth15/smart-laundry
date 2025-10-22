const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export const batchService = {
  // Get all batches for a specific date and type
  async getBatches(date, dayType, batchType) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (dayType) params.append('dayType', dayType);
    if (batchType) params.append('batchType', batchType);
    const response = await fetch(`${API_BASE}/api/batches?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch batches (${response.status} ${response.statusText})`);
    }
    const data = await response.json();

    // Backend may return either an array directly or an object like { batches: [...], count, filters }
    if (Array.isArray(data)) {
      return data;
    }

    if (data && Array.isArray(data.batches)) {
      return data.batches;
    }

    // Unexpected shape: return empty array to avoid breaking callers
    console.warn('getBatches: unexpected response shape', data);
    return [];
  },

  // Get batches for a date range (inclusive). Returns the full backend response
  async getBatchesForRange(startDate, endDate, dayType, batchType) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (dayType) params.append('dayType', dayType);
    if (batchType) params.append('batchType', batchType);

    const response = await fetch(`${API_BASE}/api/batches?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch batches for range (${response.status} ${response.statusText})`);
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
    if (!batchId || batchId === 'null' || batchId === 'undefined') {
      throw new Error('Invalid batch ID');
    }
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
    if (!batchId || batchId === 'null' || batchId === 'undefined') {
      console.warn('getBatchStudents called with invalid batchId:', batchId);
      return [];
    }
    const response = await fetch(`${API_BASE}/api/batches/${batchId}/students`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to fetch batch students');
    }
    return response.json();
  },

  // Search students by partial name or phone (returns an array of matching student objects)
  async searchStudents({ name, phone } = {}) {
    const params = new URLSearchParams();
    if (name) params.append('name', name);
    if (phone) params.append('phone', phone);

    const url = `${API_BASE}/api/students/search?${params.toString()}`;
    try {
      // Include Authorization header so backend can authenticate the requester.
      // The backend handles OPTIONS preflight for this route and CORS is enabled for /api/*.
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      if (!response.ok) {
        // If endpoint is not available or returns error, return empty list to avoid breaking callers
        console.warn('searchStudents: non-ok response', response.status);
        return [];
      }
      const data = await response.json();
      // Expecting an array of student objects; if backend returns a wrapper, try to handle it
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.students)) return data.students;
      return [];
    } catch (err) {
      console.error('searchStudents error', err);
      return [];
    }
  },

  // Remove student from a batch
  async removeStudent(batchId, studentId) {
    if (!batchId || batchId === 'null' || batchId === 'undefined') {
      throw new Error('Invalid batch ID');
    }
    if (!studentId || studentId === 'null' || studentId === 'undefined') {
      throw new Error('Invalid student ID');
    }
    const response = await fetch(`${API_BASE}/api/batches/${batchId}/students/${studentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    if (!response.ok) {
      throw new Error('Failed to remove student');
    }
    return response.json();
  },

  // Update student in a batch
  async updateStudent(batchId, studentId, studentData) {
    if (!batchId || batchId === 'null' || batchId === 'undefined') {
      throw new Error('Invalid batch ID');
    }
    if (!studentId || studentId === 'null' || studentId === 'undefined') {
      throw new Error('Invalid student ID');
    }
    const response = await fetch(`${API_BASE}/api/batches/${batchId}/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(studentData)
    });
    if (!response.ok) {
      throw new Error('Failed to update student');
    }
    return response.json();
  }
};
