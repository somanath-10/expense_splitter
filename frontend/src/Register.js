import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://expense-splitter-n6it.onrender.com/api/register', { name, email, password });
      alert('Registered! Please login.');
      navigate('/login');
    } catch (err) { alert('Error registering'); }
  };

  return (
    <div style={{ maxWidth: '300px', margin: 'auto', textAlign: 'center' }}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Name" onChange={e => setName(e.target.value)} style={{ display: 'block', width: '100%', margin: '10px 0', padding: '8px' }} />
        <input placeholder="Email" onChange={e => setEmail(e.target.value)} style={{ display: 'block', width: '100%', margin: '10px 0', padding: '8px' }} />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={{ display: 'block', width: '100%', margin: '10px 0', padding: '8px' }} />
        <button type="submit" style={{ padding: '10px 20px' }}>Register</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
};
export default Register;