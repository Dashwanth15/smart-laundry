import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles.css';
import { batchService } from './services/batchService';

function BatchType() {
  const { date, dayType, batchType } = useParams();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [batches, setBatches] = useState([]);
  const [currentBatchStudents, setCurrentBatchStudents] = useState([]);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [bagNumber, setBagNumber] = useState('');
  const [time, setTime] = useState('');
  const [numberOfClothes, setNumberOfClothes] = useState('');

  // Fetch batches when component mounts
  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const batchesData = await batchService.getBatches(date, dayType, batchType);
        console.log('Fetched batches data:', batchesData);
        // Ensure batchesData is an array
        if (Array.isArray(batchesData)) {
          // Ensure each batch has a students array
          const batchesWithStudents = batchesData.map(batch => ({
            ...batch,
            students: batch.students || []
          }));
          setBatches(batchesWithStudents);
        } else if (batchesData && Array.isArray(batchesData.batches)) {
          // In case the API returns an object with a batches property
          const batchesWithStudents = batchesData.batches.map(batch => ({
            ...batch,
            students: batch.students || []
          }));
          setBatches(batchesWithStudents);
        } else {
          console.error('Unexpected batches data format:', batchesData);
          setBatches([]);
        }
      } catch (err) {
        setError('Failed to load batches');
        console.error('Error fetching batches:', err);
        setBatches([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };

    fetchBatches();
  }, [date, dayType, batchType]);

  console.log('BatchType component rendered with:', { date, dayType, batchType });

  // Date constraints: allow adding only on today's date
  const getTodayString = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayString = getTodayString();
  const isToday = date === todayString;
  const isPast = date < todayString;
  const isFuture = date > todayString;
  const isReadOnly = !isToday; // past or future

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getBatchTypeDisplay = () => {
    switch (batchType) {
      case 'staff': return 'Staff';
      case 'boys': return 'Boys';
      case 'students': return 'Students';
      case 'girls': return 'Girls';
      default: return batchType;
    }
  };

  const getBatchTypeIcon = () => {
    switch (batchType) {
      case 'staff': return '👥';
      case 'boys': return '👨‍🎓';
      case 'students': return '👩‍🎓';
      case 'girls': return '👩‍🎓';
      default: return '📋';
    }
  };

  // Get next batch number
  const getNextBatchNumber = () => {
    return batches.length + 1;
  };

  const handleAddStudent = async () => {
    if (isReadOnly) {
      toast.info('This date is read-only. You can only view batches for past or future dates.');
      return;
    }
    if (!studentName || !studentId || !phoneNumber || !bagNumber || !time || !numberOfClothes) {
      toast.info('Please fill in all fields');
      return;
    }

    if (currentBatchStudents.length >= 20) {
      toast.info('Maximum 20 students allowed per batch');
      return;
    }

    try {
      const newStudent = {
        name: studentName,
        studentId: studentId,
        phoneNumber: phoneNumber,
        bagNumber: bagNumber,
        time: time,
        numberOfClothes: parseInt(numberOfClothes)
      };

      let batchIdToUse = currentBatchId;

      // If no current batch, create a new one
      if (!batchIdToUse) {
        const newBatch = await batchService.createBatch({
          date,
          dayType,
          batchType,
          batchNumber: getNextBatchNumber()
        });
        batchIdToUse = newBatch._id;
        setCurrentBatchId(newBatch._id);
      }

      // Add student to the current batch
      const addedStudent = await batchService.addStudent(batchIdToUse, newStudent);
      setCurrentBatchStudents([...currentBatchStudents, addedStudent]);

      // Clear form
      setStudentName('');
      setStudentId('');
      setPhoneNumber('');
      setBagNumber('');
      setTime('');
      setNumberOfClothes('');
    } catch (err) {
      console.error('Error adding student:', err);
      toast.info('Failed to add student. Please try again.');
    }
    
    // Clear form
    setStudentName('');
    setStudentId('');
    setPhoneNumber('');
    setBagNumber('');
    setTime('');
    setNumberOfClothes('');
  };

  const handleRemoveStudent = (studentId) => {
    setCurrentBatchStudents(currentBatchStudents.filter(student => student.id !== studentId));
  };

  const handleCreateBatch = () => {
    if (isReadOnly) {
      toast.info('This date is read-only. You can only view batches for past or future dates.');
      return;
    }
    if (currentBatchStudents.length === 0) {
      toast.info('Please add at least one student to create a batch');
      return;
    }

    const newBatch = {
      id: Date.now(),
      batchNumber: getNextBatchNumber(),
      type: batchType,
      students: [...currentBatchStudents],
      date: date
    };

    setBatches([...batches, newBatch]);
    setCurrentBatchStudents([]);
    setShowAddForm(false);
    console.log('Batch created:', newBatch);
  };

  const handleDeleteBatch = (batchId) => {
    setBatches(batches.filter(batch => batch.id !== batchId));
  };

  const handleBackToBatchSelection = () => {
    navigate(`/batch/${date}/${dayType}`);
  };

  const toggleAddForm = () => {
    if (isReadOnly) {
      toast.info('This date is read-only. Adding batches is disabled.');
      return;
    }
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setCurrentBatchStudents([]);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #E8E5DA 0%, #CDC392 50%, #9EB7E5 100%)',
      padding: '1rem 2rem 2rem',
      paddingTop: '1rem'
    }}>
      <ToastContainer />
      {/* Page Title and Add Batch Button */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '1rem',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        {isReadOnly && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: 'rgba(205, 195, 146, 0.25)',
            border: '1px solid #CDC392',
            color: '#2d3748',
            fontWeight: 600
          }}>
            {isPast ? 'Past date - viewing only. Adding batches is disabled.' : 'Future date - viewing only. Adding batches is disabled.'}
          </div>
        )}
        <h1 style={{ 
          color: '#648DE5', 
          marginBottom: '1rem',
          fontSize: '2rem',
          fontWeight: '800'
        }}>
          {getBatchTypeDisplay()} Batches
        </h1>
        <p style={{ color: '#2d3748', fontSize: '1.1rem', marginBottom: '1.5rem' }}>
          {formatDate(date)}
        </p>
        <button 
          onClick={toggleAddForm}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #648DE5 0%, #9EB7E5 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(100, 141, 229, 0.3)',
            margin: '0 auto',
            opacity: isReadOnly ? 0.5 : 1,
            cursor: isReadOnly ? 'not-allowed' : 'pointer'
          }}
          disabled={isReadOnly}
        >
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>+</span>
          Add Batch
        </button>
      </div>

      {/* Add Batch Form Rectangle */}
      {showAddForm && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #648DE5',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 8px 24px rgba(100, 141, 229, 0.2)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <h3 style={{ 
            color: '#648DE5', 
            marginBottom: '1rem',
            fontSize: '1.5rem',
            fontWeight: '700',
            textAlign: 'center'
          }}>
            Create {getBatchTypeDisplay()} Batch #{getNextBatchNumber()}
          </h3>
          
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '1.5rem',
            padding: '0.5rem',
            background: 'rgba(100, 141, 229, 0.1)',
            borderRadius: '8px'
          }}>
            <p style={{ margin: 0, color: '#648DE5', fontWeight: '600' }}>
              {batchType === 'staff' ? 'Staff Members:' : 'Students:'} {currentBatchStudents.length}/20
            </p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                {batchType === 'staff' ? 'Staff Name:' : 'Student Name:'}
              </label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder={batchType === 'staff' ? 'Enter staff name' : 'Enter student name'}
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1rem', 
                  border: '2px solid #CDC392', 
                  borderRadius: '10px', 
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                {batchType === 'staff' ? 'Staff ID:' : 'Student ID:'}
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder={batchType === 'staff' ? 'Enter staff ID' : 'Enter student ID'}
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1rem', 
                  border: '2px solid #CDC392', 
                  borderRadius: '10px', 
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                Phone Number:
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number"
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1rem', 
                  border: '2px solid #CDC392', 
                  borderRadius: '10px', 
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                Bag Number:
              </label>
              <input
                type="text"
                value={bagNumber}
                onChange={(e) => setBagNumber(e.target.value)}
                placeholder="Enter bag number"
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1rem', 
                  border: '2px solid #CDC392', 
                  borderRadius: '10px', 
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                Time:
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1rem', 
                  border: '2px solid #CDC392', 
                  borderRadius: '10px', 
                  fontSize: '1rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                Number of Clothes:
              </label>
              <input
                type="number"
                value={numberOfClothes}
                onChange={(e) => setNumberOfClothes(e.target.value)}
                placeholder="Enter number of clothes"
                min="1"
                style={{ 
                  width: '100%', 
                  padding: '0.875rem 1rem', 
                  border: '2px solid #CDC392', 
                  borderRadius: '10px', 
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
            <button 
              onClick={handleAddStudent}
              disabled={currentBatchStudents.length >= 20}
              style={{ 
                padding: '1rem 2rem', 
                background: currentBatchStudents.length >= 20 ? '#ccc' : 'linear-gradient(135deg, #648DE5 0%, #9EB7E5 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                cursor: currentBatchStudents.length >= 20 ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(100, 141, 229, 0.3)'
              }}
            >
              {batchType === 'staff' ? 'Add Staff' : 'Add Student'}
            </button>
            <button 
              onClick={handleCreateBatch}
              disabled={currentBatchStudents.length === 0}
              style={{ 
                padding: '1rem 2rem', 
                background: currentBatchStudents.length === 0 ? '#ccc' : 'linear-gradient(135deg, #4ECDC4 0%, #6EE7DF 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '10px', 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                cursor: currentBatchStudents.length === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Create Batch
            </button>
            <button 
              onClick={() => setShowAddForm(false)}
              style={{ 
                padding: '1rem 2rem', 
                background: 'rgba(100, 141, 229, 0.1)', 
                color: '#648DE5', 
                border: '2px solid #648DE5', 
                borderRadius: '10px', 
                fontSize: '1.1rem', 
                fontWeight: '700', 
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          {/* Current Students List */}
          {currentBatchStudents.length > 0 && (
            <div style={{ 
              background: 'rgba(232, 229, 218, 0.8)', 
              padding: '1.5rem', 
              borderRadius: '12px',
              border: '1px solid #CDC392'
            }}>
              <h4 style={{ 
                color: '#648DE5', 
                marginBottom: '1rem',
                fontSize: '1.2rem',
                fontWeight: '700',
                textAlign: 'center'
              }}>
                {batchType === 'staff' ? 'Current Staff Members' : 'Current Students'} ({currentBatchStudents.length}/20)
              </h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '1rem' 
              }}>
                {currentBatchStudents.map((student, index) => (
                  <div key={student.id} style={{ 
                    background: 'rgba(255, 255, 255, 0.9)', 
                    border: '1px solid #CDC392', 
                    borderRadius: '8px', 
                    padding: '1rem',
                    position: 'relative'
                  }}>
                    <button 
                      onClick={() => handleRemoveStudent(student.id)}
                      style={{ 
                        position: 'absolute',
                        top: '0.25rem',
                        right: '0.25rem',
                        background: '#FF6B6B', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '50%', 
                        width: '20px', 
                        height: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: '700', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#2d3748' }}>
                      <strong>{index + 1}.</strong> {student.name}
                    </p>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#648DE5' }}>
                      <strong>ID:</strong> {student.studentId}
                    </p>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#2d3748' }}>
                      <strong>Phone:</strong> {student.phoneNumber}
                    </p>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#2d3748' }}>
                      <strong>Bag:</strong> {student.bagNumber}
                    </p>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem', color: '#648DE5' }}>
                      <strong>Time:</strong> {student.time}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#2d3748' }}>
                      <strong>Clothes:</strong> {student.numberOfClothes}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Batches List */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.9)', 
        padding: '2rem', 
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ 
          color: '#648DE5', 
          marginBottom: '1rem',
          fontSize: '1.5rem',
          fontWeight: '700',
          textAlign: 'center'
        }}>
          Current {getBatchTypeDisplay()} Batches
        </h3>
        
        {!batches || batches.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem',
            color: '#9EB7E5',
            fontSize: '1.1rem'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ margin: 0, fontStyle: 'italic' }}>
              No {getBatchTypeDisplay().toLowerCase()} batches created yet
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem' }}>
              Click the "+ Add Batch" button to create your first batch
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
            gap: '1rem' 
          }}>
            {batches.map(batch => (
              <div key={batch.id} style={{ 
                background: 'rgba(232, 229, 218, 0.9)', 
                border: '2px solid #CDC392', 
                borderRadius: '12px', 
                padding: '1.5rem',
                position: 'relative'
              }}>
                <button 
                  onClick={() => handleDeleteBatch(batch.id)}
                  style={{ 
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: '#FF6B6B', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '50%', 
                    width: '28px', 
                    height: '28px', 
                    fontSize: '1.2rem', 
                    fontWeight: '700', 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ×
                </button>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  marginBottom: '1rem' 
                }}>
                  <span style={{ 
                    fontWeight: '700', 
                    fontSize: '1.1rem', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '15px', 
                    color: 'white', 
                    background: 'linear-gradient(135deg, #648DE5 0%, #9EB7E5 100%)' 
                  }}>
                    Batch #{batch.batchNumber}
                  </span>
                  <span style={{ fontSize: '1.5rem' }}>{getBatchTypeIcon()}</span>
                </div>
                
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ 
                    color: '#648DE5', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    fontSize: '1rem'
                  }}>
                    <strong>{batchType === 'staff' ? 'Staff Members:' : 'Students:'}</strong> {batch.students?.length || 0}/20
                  </p>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {batch.students && batch.students.length > 0 ? batch.students.map((student, index) => (
                    <div key={student.id} style={{ 
                      background: 'rgba(255, 255, 255, 0.8)', 
                      border: '1px solid #CDC392', 
                      borderRadius: '6px', 
                      padding: '0.75rem',
                      marginBottom: '0.5rem'
                    }}>
                      <p style={{ 
                        fontWeight: '600', 
                        color: '#2d3748', 
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.9rem'
                      }}>
                        <strong>{index + 1}.</strong> {student.name}
                      </p>
                      <p style={{ 
                        color: '#648DE5', 
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.8rem'
                      }}>
                        <strong>ID:</strong> {student.studentId} | <strong>Phone:</strong> {student.phoneNumber}
                      </p>
                      <p style={{ 
                        color: '#2d3748', 
                        margin: '0 0 0.25rem 0',
                        fontSize: '0.8rem'
                      }}>
                        <strong>Bag:</strong> {student.bagNumber} | <strong>Time:</strong> {student.time}
                      </p>
                      <p style={{ 
                        color: '#648DE5', 
                        margin: 0,
                        fontSize: '0.8rem'
                      }}>
                        <strong>Clothes:</strong> {student.numberOfClothes}
                      </p>
                    </div>
                  )) : (
                    <p style={{ 
                      textAlign: 'center', 
                      color: '#9EB7E5', 
                      fontSize: '0.9rem',
                      fontStyle: 'italic',
                      padding: '1rem'
                    }}>
                      {batchType === 'staff' ? 'No staff members added yet' : 'No students added yet'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default BatchType;
