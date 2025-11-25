import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const LoginScreen = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setError('');

            // 1. Find email for this username
            console.log('Searching for username:', username);
            const q = query(collection(db, 'users'), where('username', '==', username));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                console.log('Username not found in Firestore');
                throw new Error('Username not found');
            }

            const userDoc = querySnapshot.docs[0].data();
            console.log('User found:', userDoc);
            const email = userDoc.email;
            console.log('Attempting login with email:', email);

            // 2. Login with found email
            await login(email, password);
            console.log('Login successful');
            // Navigation handled by useEffect
        } catch (err) {
            console.error(err);
            setError('Failed to login: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[100px]"></div>
            </div>
            <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-8 max-w-md w-full relative z-10 animate-in fade-in zoom-in">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-slate-800">Nagar<span className="text-blue-600">Watch</span></h1>
                    <p className="text-slate-500 mt-2">Secure Community Portal</p>
                </div>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                        <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={username} onChange={e => setUsername(e.target.value)} required placeholder="e.g. kishal123" />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                        <input type="password" className="w-full p-3 bg-slate-50 border rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={password} onChange={e => setPassword(e.target.value)} required />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02]">
                        Secure Login
                    </button>
                </form>
                <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                    <p className="text-sm text-slate-500 mb-3">Are you a Resident?</p>
                    <button onClick={() => navigate('/register')} className="text-blue-600 font-bold hover:underline flex items-center justify-center w-full">
                        Create Account & Register House <UserPlus className="w-4 h-4 ml-2" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
