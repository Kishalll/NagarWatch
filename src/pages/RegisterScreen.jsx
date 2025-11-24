import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RegisterScreen = () => {
    const [formData, setFormData] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const validateName = (name) => /^[A-Za-z\s]+$/.test(name);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) return setError("Passwords do not match");
        if (!validateName(formData.name)) return setError("Name must contain only letters.");

        try {
            setError('');
            await register(formData.email, formData.password, {
                name: formData.name,
                username: formData.username,
                role: 'resident' // Default role
            });
            navigate('/'); // Redirect to dashboard (which will show pending state)
        } catch (err) {
            setError('Failed to register: ' + err.message);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-slate-600 mb-4 flex items-center text-sm"><LogOut className="w-4 h-4 mr-1 rotate-180" /> Back to Login</button>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">New Resident Registration</h2>
                <p className="text-slate-500 text-sm mb-6">Admin approval required before access.</p>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-200">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input placeholder="Full Name (Alphabets Only)" className="w-full p-3 border rounded-xl bg-slate-50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                    <input placeholder="Choose Username" className="w-full p-3 border rounded-xl bg-slate-50" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
                    <input type="email" placeholder="Email Address" className="w-full p-3 border rounded-xl bg-slate-50" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                    <input type="password" placeholder="Password" className="w-full p-3 border rounded-xl bg-slate-50" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
                    <input type="password" placeholder="Confirm Password" className="w-full p-3 border rounded-xl bg-slate-50" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} required />
                    <button type="submit" className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl mt-2 hover:bg-black">Submit Registration</button>
                </form>
            </div>
        </div>
    );
};

export default RegisterScreen;
