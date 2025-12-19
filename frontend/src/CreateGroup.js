// frontend/src/CreateGroup.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CreateGroup = ({ onSuccess }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  // Fetch users so we can add them to the group
  useEffect(() => {
    axios.get('https://expense-splitter-n6it.onrender.com/api/users')
      .then(res => setAllUsers(res.data));
  }, []);

  const handleToggleUser = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(uid => uid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName || selectedIds.length === 0) return alert("Enter name and select members");

    try {
      await axios.post('https://expense-splitter-n6it.onrender.com/api/groups', {
        name: groupName,
        memberIds: selectedIds
      });
      alert('Group Created!');
      setGroupName('');
      setSelectedIds([]);
      if (onSuccess) onSuccess(); // Callback to refresh parent
    } catch (err) {
      alert('Error creating group');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
      <h3>Create New Group</h3>
      <input 
        placeholder="Group Name (e.g., Goa Trip)" 
        value={groupName} 
        onChange={e => setGroupName(e.target.value)} 
        style={{ width: '90%', padding: '8px', marginBottom: '10px' }}
      />
      
      <h4>Select Members:</h4>
      <div style={{ maxHeight: '100px', overflowY: 'auto', border: '1px solid #eee', padding: '5px' }}>
        {allUsers.map(u => (
          <div key={u._id}>
            <input 
              type="checkbox" 
              checked={selectedIds.includes(u._id)} 
              onChange={() => handleToggleUser(u._id)}
            /> {u.name}
          </div>
        ))}
      </div>

      <button onClick={handleSubmit} style={{ marginTop: '10px', background: '#673ab7', color: 'white', padding: '8px 16px', border: 'none' }}>
        Save Group
      </button>
    </div>
  );
};

export default CreateGroup;