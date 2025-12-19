import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AddExpense = ({ user, onSuccess }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [splitType, setSplitType] = useState('EQUAL');
  const [selectedIds, setSelectedIds] = useState([]);
  const [splitValues, setSplitValues] = useState({});

const [groups, setGroups] = useState([]); // <--- New State

  useEffect(() => {
    // Fetch Users AND Groups
    axios.get('http://localhost:5000/api/users').then(res => setAllUsers(res.data));
    axios.get('http://localhost:5000/api/groups').then(res => setGroups(res.data)); // <--- New Fetch
  }, []);

  // New Helper: When Group is selected, auto-check the boxes
  const handleGroupSelect = (e) => {
    const groupId = e.target.value;
    if (!groupId) return;
    const group = groups.find(g => g._id === groupId);
    // Select all members of the group
    const memberIds = group.members.map(m => m._id);
    setSelectedIds(memberIds);
  };
  const handleToggleUser = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(uid => uid !== id));
      const newValues = { ...splitValues };
      delete newValues[id];
      setSplitValues(newValues);
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const calculateShare = () => {
    if (!amount || selectedIds.length === 0) return 0;
    return (parseFloat(amount) / selectedIds.length).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return alert("Select participants!");

    const members = selectedIds.map(id => ({
      userId: id,
      value: splitValues[id] || 0
    }));

    try {
      await axios.post('http://localhost:5000/api/expenses', {
        description: desc,
        amount: Number(amount),
        payerId: user.userId,
        splitType,
        members
      });
      alert('Expense Added!');
      setDesc(''); setAmount(''); setSelectedIds([]); setSplitValues({});
      onSuccess();
    } catch (err) { alert(err.response?.data?.error || "Error"); }
  };

  return (
    <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
      <h3>Add Expense</h3>
      
      {/* --- NEW GROUP SELECTOR --- */}
      <div style={{ marginBottom: '15px', padding: '10px', background: '#f0f0f0' }}>
        <label>Load from Group: </label>
        <select onChange={handleGroupSelect}>
          <option value="">-- Select a Group --</option>
          {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
        </select>
      </div>
      {/* 1. Details */}
      <input 
        placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} 
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }} 
      />
      <input 
        type="number" placeholder="Total Amount Paid ($)" value={amount} onChange={e => setAmount(e.target.value)} 
        style={{ width: '100%', padding: '10px', marginBottom: '10px' }} 
      />

      {/* 2. Participants */}
      <h4>Who was involved? (Include yourself)</h4>
      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', marginBottom: '15px' }}>
        {allUsers.map(u => {
          const isMe = u._id === user.userId;
          return (
            <div key={u._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', background: isMe ? '#e3f2fd' : 'transparent', padding: '5px' }}>
              <input 
                type="checkbox" 
                checked={selectedIds.includes(u._id)} 
                onChange={() => handleToggleUser(u._id)} 
                style={{ marginRight: '10px' }}
              />
              <span style={{ flex: 1, fontWeight: isMe ? 'bold' : 'normal' }}>
                {u.name} {isMe ? '(You)' : ''}
              </span>
              
              {(selectedIds.includes(u._id) && splitType !== 'EQUAL') && (
                <input 
                  type="number" 
                  placeholder={splitType === 'PERCENTAGE' ? '%' : '$'}
                  value={splitValues[u._id] || ''}
                  onChange={(e) => setSplitValues({...splitValues, [u._id]: e.target.value})}
                  style={{ width: '60px' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Split Type & Preview */}
      <div style={{ marginBottom: '15px' }}>
        <select value={splitType} onChange={e => setSplitType(e.target.value)} style={{ padding: '5px' }}>
          <option value="EQUAL">Equal Split</option>
          <option value="EXACT">Exact Amount</option>
          <option value="PERCENTAGE">Percentage</option>
        </select>
      </div>

      {splitType === 'EQUAL' && selectedIds.length > 0 && amount > 0 && (
        <div style={{ padding: '10px', background: '#f8f9fa', borderRadius: '5px', fontSize: '14px' }}>
          Total Bill: <b>${amount}</b><br/>
          Participants: <b>{selectedIds.length}</b><br/>
          Cost Per Person: <b>${calculateShare()}</b>
          {selectedIds.includes(user.userId) && (
            <div style={{ marginTop: '5px', color: '#555' }}>
              * You are paying <b>${amount}</b> now.<br/>
              * You are consuming <b>${calculateShare()}</b>.<br/>
              * You will be owed <b>${(amount - calculateShare()).toFixed(2)}</b>.
            </div>
          )}
        </div>
      )}

      <button onClick={handleSubmit} style={{ width: '100%', marginTop: '15px', padding: '10px', background: '#28a745', color: 'white', border: 'none' }}>
        Save Expense
      </button>
    </div>
  );
};

export default AddExpense;