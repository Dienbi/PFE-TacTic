import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import Login from './auth/Login';
import Register from './auth/Register';

function App() {
  return (
    <Router>
      <div className='App'>
        <Routes>
          <Route path='/login' element={<Login />} />
          <Route path='/signup' element={<Register />} />
          <Route path='/' element={<Navigate to='/login' replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
