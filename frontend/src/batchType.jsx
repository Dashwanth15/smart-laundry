import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import './styles.css';
import config from './config.json';
import QRCode from 'qrcode';
import { batchService } from './services/batchService';

function BatchType() {
  const { date, dayType, batchType } = useParams();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batches, setBatches] = useState([]);
  const [currentBatchStudents, setCurrentBatchStudents] = useState([]);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  // (removed unused loading/error state)
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [bagNumber, setBagNumber] = useState('');
  const [time, setTime] = useState('');
  const [numberOfClothes, setNumberOfClothes] = useState('');
  const [transactionId, setTransactionId] = useState('');
  // New: clothes items for detailed billing
  const [clothesItems, setClothesItems] = useState([]); // { type, qty, rate }
  // Tab state for Add form: 'details' or 'clothes'
  // activeTab removed: clothes card is always visible now
  // Quantities per cloth type (shown as full list in Clothes tab)
  const clothTypes = React.useMemo(() => [
    { type: 'T-shirt/Shirts', rate: 30 },
    { type: 'Shorts/Pants', rate: 30 },
    { type: 'Bedsheet', rate: 60 },
    { type: 'Blanket', rate: 60 }
  ], []);
  const [clothQuantities, setClothQuantities] = useState(() => {
    const obj = {};
    clothTypes.forEach(c => obj[c.type] = 0);
    return obj;
  });
  // Searchable dropdown state for cloth types
  const [clothSearch, setClothSearch] = useState('');
  const [filteredClothSuggestions, setFilteredClothSuggestions] = useState([]);
  const [showClothSuggestions, setShowClothSuggestions] = useState(false);
  const clothSearchRef = React.useRef(null);

  // Keep clothesItems in sync with clothQuantities
  useEffect(() => {
    const items = clothTypes
      .map(c => ({ type: c.type, qty: Number(clothQuantities[c.type] || 0), rate: c.rate }))
      .filter(it => it.qty > 0);
    setClothesItems(items);
  }, [clothQuantities, clothTypes]);
  // Filter cloth suggestions when search changes
  useEffect(() => {
    const q = clothSearch && clothSearch.trim().toLowerCase();
    if (!q) {
      setFilteredClothSuggestions([]);
      setShowClothSuggestions(false);
      return;
    }
    const matches = clothTypes.filter(c => c.type.toLowerCase().includes(q));
    setFilteredClothSuggestions(matches);
    setShowClothSuggestions(matches.length > 0);
  }, [clothSearch, clothTypes]);

  // Generate QR data URL when clothesItems or config change
  const [qrDataUrl, setQrDataUrl] = useState('');
  useEffect(() => {
    const total = clothesItems.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
    const cfg = config || {};
    const gst = cfg.gstPercent || 0;
    const upi = cfg.upiId || '';
    if (total > 0 && upi) {
      const amountWithGst = (total * (1 + gst / 100)).toFixed(2);
      const upiPayload = `upi://pay?pa=${encodeURIComponent(upi)}&pn=${encodeURIComponent('Laundry')}&am=${encodeURIComponent(amountWithGst)}&cu=INR`;
      QRCode.toDataURL(upiPayload, { width: 200, margin: 1 })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(''));
    } else {
      setQrDataUrl('');
    }
  }, [clothesItems]);

  // Invoice modal + print state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceForPrint, setInvoiceForPrint] = useState(null);

  const handleSelectClothSuggestion = (cloth) => {
    // Add to cart by incrementing quantity
    setClothQuantities(prev => ({ ...prev, [cloth.type]: (Number(prev[cloth.type] || 0) + 1) }));
    // clear search
    setClothSearch('');
    setFilteredClothSuggestions([]);
    setShowClothSuggestions(false);
    // keep focus on search input so user can add more quickly
    setTimeout(() => {
      try { clothSearchRef.current && clothSearchRef.current.focus(); } catch (e) {}
    }, 50);
  };
  const [formErrors, setFormErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);

  const validateForm = () => {
    const errs = {};
    if (!studentName || studentName.trim().length === 0) errs.name = 'Name is required';
    if (!studentId || studentId.trim().length === 0) errs.studentId = 'Student ID is required';
    if (!phone || phone.trim().length === 0) errs.phone = 'Phone is required';
    if (!bagNumber || bagNumber.trim().length === 0) errs.bagNumber = 'Bag number is required';
    if (!time) errs.time = 'Time is required';
    // Require at least one clothes item (detailed) or fallback numberOfClothes
    const totalClothes = clothesItems.reduce((s, it) => s + (Number(it.qty) || 0), 0) || (parseInt(numberOfClothes) || 0);
    if (totalClothes <= 0) errs.numberOfClothes = 'Add at least one clothing item';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };
  const [editingStudent, setEditingStudent] = useState(null); // State to hold student being edited
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBagNumber, setEditBagNumber] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNumberOfClothes, setEditNumberOfClothes] = useState('');


  // Function to fetch batches and update state
  const fetchBatches = useCallback(async () => {
    try {
      const batchesData = await batchService.getBatches(date, dayType, batchType);
      console.log('Fetched batches data:', batchesData);
      if (Array.isArray(batchesData)) {
        const batchesWithStudents = batchesData.map(batch => ({
          ...batch,
          students: batch.students || []
        }));
        setBatches(batchesWithStudents);
      } else if (batchesData && Array.isArray(batchesData.batches)) {
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
      console.error('Error fetching batches:', err);
      setBatches([]);
    }
  }, [date, dayType, batchType]);

  // Fetch batches when component mounts or query params change
  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

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

  // Accordion item for a single batch
  function AccordionBatch({ batch, batchType, isReadOnly, onRemoveStudent, onEditStudent, onDeleteBatch, onAddStudent }) {
    const [expanded, setExpanded] = useState(false);

    const toggle = () => setExpanded(e => !e);

    return (
      <div style={{ marginBottom: '1rem', borderRadius: 12, overflow: 'hidden', border: '1px solid #CDC392', background: 'white' }}>
        <div
          onClick={toggle}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(90deg, rgba(100,141,229,0.1), rgba(158,183,229,0.05))',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#2d3748' }}>Batch #{batch.batchNumber}</div>
            <div style={{ fontSize: '0.9rem', color: '#648DE5' }}>{batchType === 'staff' ? 'Staff' : 'Students'}: {(batch.students || []).length}/20</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.1rem' }}>{getBatchTypeIcon()}</div>
            <div style={{ fontSize: '1.25rem', color: '#648DE5' }}>{expanded ? '▾' : '▸'}</div>
          </div>
        </div>

        {expanded && (
          <div style={{ padding: '1rem', background: 'rgba(232,229,218,0.6)' }}>
            {(batch.students && batch.students.length > 0) ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.5rem', width: '4%', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '0.5rem', width: '20%', textAlign: 'left' }}>Name</th>
                      <th style={{ padding: '0.5rem', width: '8%', textAlign: 'left' }}>ID</th>
                      <th style={{ padding: '0.5rem', width: '12%', textAlign: 'left' }}>Phone</th>
                      <th style={{ padding: '0.5rem', width: '15%', textAlign: 'left' }}>Email</th>
                      <th style={{ padding: '0.5rem', width: '15%', textAlign: 'left' }}>Address</th>
                      <th style={{ padding: '0.5rem', width: '5%', textAlign: 'left' }}>Bag</th>
                      <th style={{ padding: '0.5rem', width: '6%', textAlign: 'left' }}>Time</th>
                      <th style={{ padding: '0.5rem', width: '6%', textAlign: 'left' }}>Clothes</th>
                      <th style={{ padding: '0.5rem', width: '9%', textAlign: 'left' }}>Added By</th>
                      <th style={{ padding: '0.5rem', width: '5%', textAlign: 'left' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.students.map((student, idx) => (
                      <tr key={student.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{idx + 1}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.name}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.studentId}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.phone || student.phoneNumber || ''}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.email || ''}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.address || ''}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.bagNumber}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.time}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.numberOfClothes}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>{student.addedBy || ''}</td>
                        <td style={{ padding: '0.5rem', verticalAlign: 'top', textAlign: 'left' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => onEditStudent(batch._id, student)}
                              disabled={isReadOnly}
                              style={{ padding: '0.35rem 0.5rem', background: '#648DE5', color: 'white', border: 'none', borderRadius: 6, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onRemoveStudent(batch._id, student.id)}
                              disabled={isReadOnly}
                              style={{ padding: '0.35rem 0.5rem', background: '#FF6B6B', color: 'white', border: 'none', borderRadius: 6, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#9EB7E5' }}>No students added yet</div>
            )}
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => onAddStudent(batch._id || batch.id)}
                disabled={isReadOnly}
                style={{ padding: '0.5rem 0.75rem', background: '#4ECDC4', color: 'white', border: 'none', borderRadius: 8, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
              >
                Create Order
              </button>
              <button
                onClick={() => onDeleteBatch(batch._id)}
                disabled={isReadOnly}
                style={{ padding: '0.5rem 0.75rem', background: '#FF6B6B', color: 'white', border: 'none', borderRadius: 8, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}
              >
                Delete Batch
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Get next batch number
  const getNextBatchNumber = () => {
    // Find highest numeric batchNumber among existing batches and increment.
    // This prevents duplicates when batches are deleted.
    if (!batches || batches.length === 0) return 1;
    const nums = batches
      .map(b => Number(b.batchNumber))
      .filter(n => !Number.isNaN(n) && Number.isFinite(n));
    if (nums.length === 0) return 1;
    return Math.max(...nums) + 1;
  };

  const handleAddStudent = async () => {
    if (isReadOnly) {
      toast.info('This date is read-only. You can only view batches for past or future dates.');
      return;
    }
    // Validate form
    if (!validateForm()) {
      toast.info('Please fix form errors before submitting');
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
        phone: phone,
        bagNumber: bagNumber,
        time: time,
        numberOfClothes: clothesItems.reduce((s, it) => s + (Number(it.qty) || 0), 0) || parseInt(numberOfClothes),
        email: email, // Explicitly send email
        address: address // Explicitly send address
      };

      // Include transaction id if provided
      if (transactionId && transactionId.trim().length > 0) {
        newStudent.transactionId = transactionId.trim();
      }

      // Include clothes breakdown and totalAmount
      const totalAmount = clothesItems.reduce((s, it) => s + ((Number(it.qty) || 0) * (Number(it.rate) || 0)), 0);
      if (clothesItems.length > 0) {
        newStudent.clothesBreakdown = clothesItems.map(it => ({ type: it.type, qty: Number(it.qty), rate: Number(it.rate) }));
        newStudent.totalAmount = totalAmount;
      }

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
      const addedResp = await batchService.addStudent(batchIdToUse, newStudent);
      // backend returns { message, student, batch_id } or the student directly
      const addedStudent = addedResp && addedResp.student ? addedResp.student : addedResp;
      // Ensure student object has an id if backend returned differently
      const studentObj = addedStudent || {};
      setCurrentBatchStudents(prev => [...prev, studentObj]);

      // Also update batches state so accordion counts update immediately
      setBatches(prevBatches => prevBatches.map(b => {
        const id = b._id || b.id;
        if (id === batchIdToUse) {
          return { ...b, students: [ ...(b.students || []), studentObj ] };
        }
        return b;
      }));

      // Clear form
      setStudentName('');
      setStudentId('');
      setPhone('');
      setBagNumber('');
      setTime('');
  setNumberOfClothes('');
      setClothesItems([]);
      // reset quantities
      setClothQuantities(() => {
        const obj = {};
        clothTypes.forEach(c => obj[c.type] = 0);
        return obj;
      });
      setEmail('');
      setAddress('');
    } catch (err) {
      console.error('Error adding student:', err);
      toast.info('Failed to add student. Please try again.');
    }
    
    // Clear form
    setStudentName('');
    setStudentId('');
    setPhone('');
    setBagNumber('');
    setTime('');
    setNumberOfClothes('');
    setEmail('');
    setAddress('');
  };
  
  // ref to student name input to focus when opening add form
  const studentNameRef = React.useRef(null);
  const searchTimer = React.useRef(null);

  // Trigger search when user types name (4+ chars) or phone (2+ chars)
  useEffect(() => {
    // Clear previous timer
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const nameQuery = studentName && studentName.trim().length >= 4 ? studentName.trim() : null;
    const phoneQuery = phone && phone.trim().length >= 2 ? phone.trim() : null;

    if (!nameQuery && !phoneQuery) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    // Debounce the search by 300ms
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await batchService.searchStudents({ name: nameQuery, phone: phoneQuery });
        setSuggestions(results || []);
        setShowSuggestions((results || []).length > 0);
      } catch (err) {
        console.error('Error searching students:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [studentName, phone]);

  const handleSelectSuggestion = (student) => {
    // Autofill fields from selected student
    setStudentName(student.name || '');
    setStudentId(student.studentId || '');
    setPhone(student.phone || student.phoneNumber || '');
    setEmail(student.email || '');
    setAddress(student.address || '');
    setBagNumber(student.bagNumber || '');
    setTime(student.time || '');
    setNumberOfClothes(student.numberOfClothes ? String(student.numberOfClothes) : '');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleRemoveStudent = async (batchId, studentIdToRemove) => {
    if (isReadOnly) {
      toast.info('This date is read-only. You can only view batches for past or future dates.');
      return;
    }
    try {
      await batchService.removeStudent(batchId, studentIdToRemove);
      toast.success('Student removed successfully!');
      fetchBatches(); // Re-fetch batches to update the UI
    } catch (err) {
      console.error('Error removing student:', err);
      toast.error('Failed to remove student. Please try again.');
    }
  };

  const handleEditStudent = (batchId, student) => {
    if (isReadOnly) {
      toast.info('This date is read-only. You can only view batches for past or future dates.');
      return;
    }
    setEditingStudent({ ...student, batchId });
    setEditStudentName(student.name);
    setEditStudentId(student.studentId);
    setEditPhone(student.phone);
    setEditEmail(student.email);
    setEditAddress(student.address);
    setEditBagNumber(student.bagNumber);
    setEditTime(student.time);
    setEditNumberOfClothes(student.numberOfClothes);
  };

  const handleUpdateStudent = async () => {
    if (isReadOnly) {
      toast.info('This date is read-only. You can only view batches for past or future dates.');
      return;
    }
    if (!editingStudent) return;

    const updatedStudentData = {
      name: editStudentName,
      studentId: editStudentId,
      phone: editPhone,
      email: editEmail,
      address: editAddress,
      bagNumber: editBagNumber,
      time: editTime,
      numberOfClothes: parseInt(editNumberOfClothes),
    };

    try {
      await batchService.updateStudent(editingStudent.batchId, editingStudent.id, updatedStudentData);
      toast.success('Student updated successfully!');
      setEditingStudent(null); // Exit editing mode
      fetchBatches(); // Re-fetch batches to update the UI
    } catch (err) {
      console.error('Error updating student:', err);
      toast.error('Failed to update student. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setEditStudentName('');
    setEditStudentId('');
    setEditPhone('');
    setEditEmail('');
    setEditAddress('');
    setEditBagNumber('');
    setEditTime('');
    setEditNumberOfClothes('');
  };

  const handleDeleteBatch = (batchId) => {
    setBatches(batches.filter(batch => batch.id !== batchId));
  };

  

  // Helper: get last batch for current date
  const getLastBatch = () => {
    if (!batches || batches.length === 0) return null;
    // Sort by batchNumber descending
    const sorted = [...batches].sort((a, b) => (b.batchNumber || 0) - (a.batchNumber || 0));
    return sorted[0];
  };

  // Open invoice preview modal with provided data
  const openInvoiceModal = (subtotal, gstPercent, totalWithGst, items) => {
    setInvoiceForPrint({
      subtotal: Number(subtotal) || 0,
      gstPercent: Number(gstPercent) || 0,
      totalWithGst: Number(totalWithGst) || 0,
      items,
      generatedAt: new Date()
    });
    setShowInvoiceModal(true);
  };

  // Print invoice by writing HTML into a hidden iframe and calling print on it
  const printInvoiceToPrinter = (data) => {
    try {
      const { subtotal, gstPercent, totalWithGst, items, generatedAt } = data;
      const gstAmount = +(subtotal * (gstPercent / 100));
      const widthPx = 240; // ~2.5 inch
      const shopTitle = (config && config.shopTitle) ? config.shopTitle : 'WashUp Laundry';
      const shopPhone = (config && config.shopPhone) ? config.shopPhone : '';
      const lines = items.map(it => `<tr><td style="padding:4px 0;">${it.type}</td><td style="padding:4px 0;text-align:right;">${it.qty} x ₹${it.rate}</td></tr>`).join('');
      const qrImg = qrDataUrl ? `<div style="text-align:center;margin-top:8px;"><img src="${qrDataUrl}" style="width:140px;height:140px;border:1px solid #e2e8f0;border-radius:6px;"/></div>` : '';
      const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice</title><style>@media print{@page{size:${widthPx}px auto;margin:0;}body{-webkit-print-color-adjust:exact;}}body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:8px}.invoice{width:${widthPx}px}h2{margin:0 0 6px 0;font-size:16px;text-align:center}table{width:100%;border-collapse:collapse;font-size:12px}.total{font-weight:700;font-size:14px;margin-top:8px}</style></head><body><div class="invoice"><h2>${shopTitle}</h2><div style="text-align:center;font-size:11px;margin-bottom:4px;">${shopPhone}</div><div style="text-align:center;font-size:10px;margin-bottom:6px;">${new Date(generatedAt).toLocaleString()}</div><table>${lines}</table><div style="margin-top:8px;"><div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;"><span>Subtotal</span><span>₹${(subtotal).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;padding:2px 0;"><span>GST (${gstPercent}%)</span><span>₹${(gstAmount).toFixed(2)}</span></div><div class="total" style="display:flex;justify-content:space-between;padding-top:6px;"><span>Total</span><span>₹${(totalWithGst).toFixed(2)}</span></div></div>${qrImg}<div style="text-align:center;margin-top:10px;font-size:11px;">Thank You</div></div><script>window.onload=function(){try{window.focus();window.print();}catch(e){console.error(e);}};</script></body></html>`;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      // remove iframe after printing
      setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) {} }, 3000);
      setShowInvoiceModal(false);
    } catch (err) {
      console.error('Failed to print invoice via iframe', err);
      alert('Failed to print invoice. See console for details.');
    }
  };

  const toggleAddForm = () => {
    if (isReadOnly) {
      toast.info('This date is read-only. Adding batches is disabled.');
      return;
    }
    // Check last batch for current date
    const lastBatch = getLastBatch();
    if (lastBatch && (lastBatch.students?.length || 0) < 20) {
      setShowBatchModal(true);
      return;
    }
    setShowAddForm(!showAddForm);
    if (!showAddForm) {
      setCurrentBatchStudents([]);
    }
  };

  // Modal handlers
  const handleBatchModalYes = () => {
    setShowBatchModal(false);
    setShowAddForm(true);
    setCurrentBatchStudents([]);
  };
  const handleBatchModalNo = () => {
    setShowBatchModal(false);
    // Continue with last batch: set currentBatchId and students
    const lastBatch = getLastBatch();
    if (lastBatch) {
      setCurrentBatchId(lastBatch._id);
      setCurrentBatchStudents(lastBatch.students || []);
      setShowAddForm(true);
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
      {/* Page Title and Add Batch Button - single row layout */}
      <div style={{ 
        marginBottom: '1rem',
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        {isReadOnly && (
          <div style={{
            marginBottom: '0.75rem',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            background: 'rgba(205, 195, 146, 0.25)',
            border: '1px solid #CDC392',
            color: '#2d3748',
            fontWeight: 600
          }}>
            {isPast ? 'Past date - viewing only. Adding batches is disabled.' : 'Future date - viewing only. Adding batches is disabled.'}
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <h1 style={{ 
            color: '#648DE5', 
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: '800'
          }}>
            {getBatchTypeDisplay()} Batches
          </h1>

          <p style={{ color: '#2d3748', fontSize: '1rem', margin: 0 }}>
            {formatDate(date)}
          </p>

          <div>
            <button 
              onClick={toggleAddForm}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.1rem',
                background: 'linear-gradient(135deg, #648DE5 0%, #9EB7E5 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(100, 141, 229, 0.3)',
                opacity: isReadOnly ? 0.5 : 1,
                cursor: isReadOnly ? 'not-allowed' : 'pointer'
              }}
              disabled={isReadOnly}
            >
              <span style={{ fontSize: '1.1rem', fontWeight: '700' }}>+</span>
              Add Batch
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Warn if last batch is not full */}
      {showBatchModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.2)', minWidth: 320 }}>
            <h3 style={{ color: '#648DE5', marginBottom: '1rem' }}>
              Current batch #{getLastBatch()?.batchNumber} is not full ({getLastBatch()?.students?.length || 0}/20 students).<br />
              Still want to create new batch?
            </h3>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button onClick={handleBatchModalYes} style={{ padding: '0.75rem 1.5rem', background: '#648DE5', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600 }}>Yes, create new batch</button>
              <button onClick={handleBatchModalNo} style={{ padding: '0.75rem 1.5rem', background: '#E8E5DA', color: '#2d3748', border: '1px solid #CDC392', borderRadius: 8, fontWeight: 600 }}>No, continue with last batch</button>
            </div>
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ color: '#648DE5', margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>
              {currentBatchId ? `Create Order - ${getBatchTypeDisplay()} Batch #${
                (batches.find(b => (b._id || b.id) === currentBatchId)?.batchNumber) || getNextBatchNumber()
              }` : `Create ${getBatchTypeDisplay()} Batch #${getNextBatchNumber()}`}
            </h3>
            <div style={{ color: '#648DE5', fontWeight: 600 }}>{batchType === 'staff' ? 'Staff Members:' : 'Students:'} {currentBatchStudents.length}/20</div>
          </div>
          
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', alignItems: 'start' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>{batchType === 'staff' ? 'Staff Name:' : 'Student Name:'}</label>
              <div>
                <input
                  type="text"
                  ref={studentNameRef}
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder={batchType === 'staff' ? 'Enter staff name' : 'Enter student name'}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', border: '2px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
                {formErrors.name && <div style={{ color: 'red', marginTop: 6 }}>{formErrors.name}</div>}
                {showSuggestions && (
                  <div style={{ marginTop: 8, border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', maxHeight: 180, overflowY: 'auto', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                    {searching ? (
                      <div style={{ padding: '0.5rem 0.75rem', color: '#648DE5' }}>Searching...</div>
                    ) : (
                      suggestions.map(s => (
                        <div key={s._id || s.id || s.studentId} onClick={() => handleSelectSuggestion(s)} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                          <div style={{ fontWeight: 700, color: '#2d3748' }}>{s.name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{s.studentId || ''} {s.phone ? `· ${s.phone}` : ''} {s.email ? `· ${s.email}` : ''}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>{batchType === 'staff' ? 'Staff ID:' : 'Student ID:'}</label>
              <div>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder={batchType === 'staff' ? 'Enter staff ID' : 'Enter student ID'}
                  style={{ width: '100%', padding: '0.75rem 0.9rem', border: '2px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
                {formErrors.studentId && <div style={{ color: 'red', marginTop: 6 }}>{formErrors.studentId}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>Phone:</label>
              <div>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" style={{ width: '100%', padding: '0.75rem 0.9rem', border: '2px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }} />
                {formErrors.phone && <div style={{ color: 'red', marginTop: 6 }}>{formErrors.phone}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>Bag Number:</label>
              <div>
                <input type="text" value={bagNumber} onChange={(e) => setBagNumber(e.target.value)} placeholder="Enter bag number" style={{ width: '100%', padding: '0.75rem 0.9rem', border: '2px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }} />
                {formErrors.bagNumber && <div style={{ color: 'red', marginTop: 6 }}>{formErrors.bagNumber}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>Email:</label>
              <div>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" style={{ width: '100%', padding: '0.75rem 0.9rem', border: '2px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>Address:</label>
              <div>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address" style={{ width: '100%', padding: '0.75rem 0.9rem', border: '2px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }} />
              </div>
            </div>

            {/* Transaction ID moved below the clothes summary */}

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>Time:</label>
              <div>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: '100%', padding: '0.75rem 0.9rem', border: '2px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }} />
                {formErrors.time && <div style={{ color: 'red', marginTop: 6 }}>{formErrors.time}</div>}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              </div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>Add Clothes:</label>
              <div>
                <div style={{ border: '1px solid #e6e9ee', borderRadius: 8, padding: 12, background: '#fafafa', minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  <input
                    type="text"
                    ref={clothSearchRef}
                    value={clothSearch}
                    onChange={(e) => setClothSearch(e.target.value)}
                    placeholder="Search cloth types (e.g. T-shirt, Bedsheet)"
                    style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  />
                  {showClothSuggestions && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', maxHeight: 220, overflowY: 'auto', marginTop: 8, width: '100%', minWidth: 220 }}>
                      {filteredClothSuggestions.map(s => (
                        <div key={s.type} onClick={() => handleSelectClothSuggestion(s)} style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.type}>{s.type}</div>
                          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>₹{s.rate}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* QR code and GST info: show when total amount > 0 */}
                  {(() => {
                    const total = clothesItems.reduce((s, it) => s + (it.qty || 0) * (it.rate || 0), 0);
                    const cfg = config || {};
                    const gst = cfg.gstPercent || 0;
                    if (total > 0 && qrDataUrl) {
                      const amountWithGst = (total * (1 + gst / 100)).toFixed(2);
                      return (
                        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ fontSize: '0.95rem', color: '#2d3748' }}>Amount: ₹{total} (+{gst}% GST) = ₹{amountWithGst}</div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <img src={qrDataUrl} alt="UPI QR" style={{ width: 120, height: 120, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <div>
                              <button onClick={() => openInvoiceModal(total, gst, amountWithGst, clothesItems)} style={{ padding: '0.5rem 0.75rem', borderRadius: 8, background: '#648DE5', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 700 }}>invoice</button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '0.5rem', alignItems: 'center' }}>
              <label style={{ color: '#648DE5', fontWeight: 600 }}>Items:</label>
              <div>
                <div style={{ border: '1px solid #e6e9ee', borderRadius: 10, padding: 12, background: 'rgb(250,250,250)' }}>
                  <div style={{ minHeight: 48 }}>
                    {clothesItems.length === 0 ? (
                      <div style={{ padding: '0.75rem', color: '#6b7280' }}>No cloth items added. Use the search on the left to add.</div>
                    ) : (
                      <div>
                        {clothesItems.map(ci => (
                          <div key={ci.type} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 140px 90px', gap: 12, alignItems: 'center', padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={ci.type}>{ci.type}</div>
                            <div style={{ color: '#6b7280', textAlign: 'right' }}>₹{ci.rate}</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                              <button type="button" onClick={() => setClothQuantities(prev => ({ ...prev, [ci.type]: Math.max(0, (Number(prev[ci.type] || 0) - 1)) }))} style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid #e2e8f0' }}>-</button>
                              <div style={{ minWidth: 36, textAlign: 'center' }}>{ci.qty || 0}</div>
                              <button type="button" onClick={() => setClothQuantities(prev => ({ ...prev, [ci.type]: (Number(prev[ci.type] || 0) + 1) }))} style={{ padding: '0.35rem 0.6rem', borderRadius: 6, background: '#4ECDC4', color: 'white', border: 'none' }}>+</button>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                              <button type="button" onClick={() => setClothQuantities(prev => ({ ...prev, [ci.type]: 0 }))} style={{ padding: '0.35rem 0.6rem', borderRadius: 6, border: '1px solid #FF6B6B', color: '#FF6B6B', background: 'transparent' }}>Remove</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 12, textAlign: 'right', fontWeight: 700, color: '#2d3748' }}>
                    {(() => {
                      const subtotal = clothesItems.reduce((s, it) => s + (it.qty * it.rate), 0);
                      const gstPercent = (config && config.gstPercent) ? Number(config.gstPercent) : 0;
                      const gstAmount = +(subtotal * (gstPercent / 100));
                      const totalWithGst = +(subtotal + gstAmount);
                      return (
                        <div>
                          Total Clothes: {clothesItems.reduce((s, it) => s + it.qty, 0)} • GST: ₹{gstAmount.toFixed(2)} • Total: ₹{totalWithGst.toFixed(2)}
                        </div>
                      );
                    })()}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
                      <label style={{ color: '#648DE5', fontWeight: 600 }}>Transaction ID:</label>
                      <div>
                        <input type="text" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="Optional: Payment transaction id" style={{ width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #CDC392', borderRadius: '8px' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
              Create Order
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
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '4%' }}>#</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '28%' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '12%' }}>ID</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '14%' }}>Phone</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '10%' }}>Bag</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '12%' }}>Time</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '10%' }}>Clothes</th>
                      <th style={{ textAlign: 'left', padding: '0.5rem', width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBatchStudents.map((student, index) => (
                      <tr key={student.id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.5rem' }}>{index + 1}</td>
                        <td style={{ padding: '0.5rem' }}>{student.name}</td>
                        <td style={{ padding: '0.5rem' }}>{student.studentId}</td>
                        <td style={{ padding: '0.5rem' }}>{student.phone || student.phoneNumber || ''}</td>
                        <td style={{ padding: '0.5rem' }}>{student.bagNumber}</td>
                        <td style={{ padding: '0.5rem' }}>{student.time}</td>
                        <td style={{ padding: '0.5rem' }}>{student.numberOfClothes}</td>
                        <td style={{ padding: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => handleEditStudent(currentBatchId, student)} disabled={isReadOnly} style={{ padding: '0.35rem 0.5rem', background: '#648DE5', color: 'white', border: 'none', borderRadius: 6, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}>Edit</button>
                            <button onClick={() => handleRemoveStudent(currentBatchId, student.id)} disabled={isReadOnly} style={{ padding: '0.35rem 0.5rem', background: '#FF6B6B', color: 'white', border: 'none', borderRadius: 6, cursor: isReadOnly ? 'not-allowed' : 'pointer' }}>Remove</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
          <div>
            {/* Accordion container */}
            {batches.map(batch => (
              <AccordionBatch
                key={batch._id || batch.id}
                batch={batch}
                batchType={batchType}
                isReadOnly={isReadOnly}
                onRemoveStudent={handleRemoveStudent}
                onEditStudent={handleEditStudent}
                onDeleteBatch={handleDeleteBatch}
                onAddStudent={async (batchId) => {
                  // Set UI to add a student to this specific batch.
                  // Use batchId directly, and try to find the batch locally; if not present, refresh.
                  setCurrentBatchId(batchId);
                  let selected = batches.find(b => (b._id || b.id) === batchId);
                  if (!selected) {
                    // batch list may be stale - refresh and try again
                    await fetchBatches();
                    selected = (batches.find && batches.find(b => (b._id || b.id) === batchId)) || null;
                  }
                  setCurrentBatchStudents(selected ? (selected.students || []) : []);
                  setShowAddForm(true);
                  // focus the name input after a tiny delay to allow rendering
                  setTimeout(() => { try { studentNameRef.current && studentNameRef.current.focus(); } catch (e) {} }, 50);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Student Modal/Form */}
      {editingStudent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{
              color: '#648DE5',
              marginBottom: '1.5rem',
              fontSize: '1.8rem',
              fontWeight: '700',
              textAlign: 'center'
            }}>
              Edit {batchType === 'staff' ? 'Staff Member' : 'Student'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                  {batchType === 'staff' ? 'Staff Name:' : 'Student Name:'}
                </label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                  {batchType === 'staff' ? 'Staff ID:' : 'Student ID:'}
                </label>
                <input
                  type="text"
                  value={editStudentId}
                  onChange={(e) => setEditStudentId(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                  Phone:
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                  Bag Number:
                </label>
                <input
                  type="text"
                  value={editBagNumber}
                  onChange={(e) => setEditBagNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                  Email:
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                  Address:
                </label>
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
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
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#648DE5', fontWeight: '600' }}>
                  Number of Clothes:
                </label>
                <input
                  type="number"
                  value={editNumberOfClothes}
                  onChange={(e) => setEditNumberOfClothes(e.target.value)}
                  min="1"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #CDC392', borderRadius: '8px', fontSize: '1rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleUpdateStudent}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #4ECDC4 0%, #6EE7DF 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(78, 205, 196, 0.3)'
                }}
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(100, 141, 229, 0.1)',
                  color: '#648DE5',
                  border: '2px solid #648DE5',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showInvoiceModal && invoiceForPrint && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ background: 'white', padding: 16, borderRadius: 8, width: 280, boxShadow: '0 6px 24px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, color: '#648DE5' }}>{(config && config.shopTitle) ? config.shopTitle : 'WashUp Laundry'}</div>
              <div style={{ fontSize: 12 }}>{new Date(invoiceForPrint.generatedAt).toLocaleString()}</div>
            </div>
            <div style={{ maxHeight: 320, overflowY: 'auto', fontSize: 13 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {invoiceForPrint.items.map(it => (
                    <tr key={it.type}><td style={{ padding: '4px 0' }}>{it.type}</td><td style={{ padding: '4px 0', textAlign: 'right' }}>{it.qty} x ₹{it.rate}</td></tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>₹{(invoiceForPrint.subtotal).toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST ({invoiceForPrint.gstPercent}%)</span><span>₹{(invoiceForPrint.subtotal * invoiceForPrint.gstPercent / 100).toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 6 }}><span>Total</span><span>₹{(invoiceForPrint.totalWithGst).toFixed(2)}</span></div>
                {qrDataUrl && <div style={{ textAlign: 'center', marginTop: 8 }}><img src={qrDataUrl} style={{ width: 140, height: 140, borderRadius: 6 }} alt="qr" /></div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => { printInvoiceToPrinter(invoiceForPrint); }} style={{ padding: '0.5rem 0.75rem', background: '#4ECDC4', color: 'white', border: 'none', borderRadius: 6 }}>Print</button>
              <button onClick={() => setShowInvoiceModal(false)} style={{ padding: '0.5rem 0.75rem', background: '#E8E5DA', color: '#2d3748', border: '1px solid #CDC392', borderRadius: 6 }}>Close</button>
            </div>
          </div>
        </div>
      )}

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
