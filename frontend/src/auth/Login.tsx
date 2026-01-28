import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Login.css';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Login attempt:', { username, password });
    };

    return (
        <div className='login-page'>
            {/* Geometric Shapes */}
            <div className='shape-left-curve'></div>
            <div className='shape-top-right-stripes'></div>
            <div className='shape-bottom-right-triangles'>
                <div className='triangle t1'></div>
                <div className='triangle t2'></div>
            </div>

            <div className='login-content'>
                <div className='logo-section'>
                    <img 
                        src='/assets/logo TacTic.png' 
                        alt='TacTic Logo' 
                        className='main-logo' 
                    />
                </div>
                
                <h1 className='page-title'>login</h1>

                <form onSubmit={handleSubmit} className='login-form'>
                    <div className='input-group'>
                        <label htmlFor='username'>Username</label>
                        <input
                            type='text'
                            id='username'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className='input-group'>
                        <label htmlFor='password'>Password</label>
                        <input
                            type='password'
                            id='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type='submit' className='btn-login'>
                        login
                    </button>

                    <div className='form-footer'>
                        <div className='forgot-password'>
                            Forgot Password? <a href='#'>Change Password</a>
                        </div>
                        <div className='signup-link'>
                            Don't have an account? <Link to='/signup'>Signup</Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
