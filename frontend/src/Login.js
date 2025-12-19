import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Login = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('https://expense-splitter-n6it.onrender.com/api/login', { email, password });
      if (res.data.status === 'ok') {
        localStorage.setItem('token', res.data.token);
        const userData = { userId: res.data.userId, name: res.data.name };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (err) { alert('Invalid login'); }
  };

  return (
    <div style={{ maxWidth: '300px', margin: 'auto', textAlign: 'center' }}>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Email" onChange={e => setEmail(e.target.value)} style={{ display: 'block', width: '100%', margin: '10px 0', padding: '8px' }} />
        <input type="password" placeholder="Password" onChange={e => setPassword(e.target.value)} style={{ display: 'block', width: '100%', margin: '10px 0', padding: '8px' }} />
        <button type="submit" style={{ padding: '10px 20px' }}>Login</button>
      </form>
      <p>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  );
};
export default Login;