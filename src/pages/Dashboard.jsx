import React, { useState, useEffect } from 'react';
import {
    Users, Map as MapIcon, Calendar, Check, X, Home, LogOut,
    Plus, UserCog, Clock, ShieldAlert, Edit2, Trash2, MessageSquare, Send
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// --- CONSTANTS ---
const CENTER_LAT = 12.904751;
const CENTER_LNG = 80.157509;
const MAP_BOUNDS = [[12.901000, 80.154000], [12.909000, 80.161000]];

// --- ICONS ---
const createCustomIcon = (colorClass) => {
    let color = '#10b981'; // Green
    if (colorClass.includes('rose')) color = '#f43f5e'; // Red
    if (colorClass.includes('sky')) color = '#0ea5e9'; // Blue
    if (colorClass.includes('indigo')) color = '#6366f1'; // Indigo
    if (colorClass.includes('slate')) color = '#1e293b'; // Black
    if (colorClass.includes('yellow')) color = '#eab308'; // Yellow

    const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" class="w-8 h-8 drop-shadow-md">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>
  `;
    return L.divIcon({ html: svgHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });
};

const Dashboard = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('map');

    // --- PENDING STATE BLOCKER ---
    if (currentUser?.status === 'pending') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full animate-in fade-in zoom-in">
                    <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Approval Pending</h1>
                    <p className="text-slate-500 mb-6">
                        Your account is currently waiting for Admin approval. You will get access to the dashboard once approved.
                    </p>
                    <button
                        onClick={async () => { await logout(); navigate('/login'); }}
                        className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-900 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </div>
        );
    }

    // Data States
    const [houses, setHouses] = useState([]);
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [meetings, setMeetings] = useState([]);

    // UI States
    const [selectedHouse, setSelectedHouse] = useState(null);
    const [isAddingHouseMode, setIsAddingHouseMode] = useState(false);
    const [newHousePos, setNewHousePos] = useState(null);
    const [isEditingHouse, setIsEditingHouse] = useState(false);

    // Form States
    const [formHouseType, setFormHouseType] = useState('single_villa');
    const [formStatus, setFormStatus] = useState('occupied');

    // Modals
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState(null);
    const [noteInputs, setNoteInputs] = useState({});

    // --- REAL-TIME DATA SYNC ---
    useEffect(() => {
        const unsubHouses = onSnapshot(collection(db, 'houses'), (snap) => {
            setHouses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubEvents = onSnapshot(collection(db, 'events'), (snap) => {
            setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubMeetings = onSnapshot(collection(db, 'meetings'), (snap) => {
            setMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubHouses(); unsubUsers(); unsubEvents(); unsubMeetings(); };
    }, []);

    // --- DERIVED STATE ---
    const pendingHouses = houses.filter(h => h.status === 'pending');
    const pendingUsers = users.filter(u => u.status === 'pending');
    const myPendingHouse = houses.find(h => h.userId === currentUser.uid && h.status === 'pending');

    // --- AUTO-START ADD HOUSE MODE ---
    useEffect(() => {
        if (currentUser.role === 'resident' && !myPendingHouse && !houses.find(h => h.userId === currentUser.uid) && activeTab === 'map') {
            setIsAddingHouseMode(true);
        }
    }, [currentUser, houses, activeTab, myPendingHouse]);

    const getHouseColorClass = (status) => {
        if (currentUser.role === 'resident' && status === 'away') return 'bg-emerald-500'; // Privacy masking
        switch (status) {
            case 'occupied': return 'bg-emerald-500';
            case 'away': return 'bg-rose-500';
            case 'vacant_rent': return 'bg-sky-500';
            case 'vacant_sale': return 'bg-indigo-500';
            case 'pending': return 'bg-slate-800';
            default: return 'bg-gray-400';
        }
    };

    // --- ACTIONS ---
    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleAdminAddHouse = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        // If resident is registering, set status to pending and use their userId
        // If admin is adding, use the selected status and mark as admin_created
        const houseData = {
            ...data,
            ...newHousePos,
            type: formHouseType, // Explicitly save the type
            userId: currentUser.role === 'resident' ? currentUser.uid : 'admin_created',
            status: currentUser.role === 'resident' ? 'pending' : formStatus,
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'houses'), houseData);
        setIsAddingHouseMode(false);
        setNewHousePos(null);
        // Reset form defaults
        setFormHouseType('single_villa');
        setFormStatus('occupied');
    };

    const handleAdminEditHouse = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        await updateDoc(doc(db, 'houses', selectedHouse.id), data);
        setIsEditingHouse(false);
        setSelectedHouse(null);
    };

    const handleDeleteHouse = async (houseId) => {
        if (window.confirm("Are you sure?")) {
            await deleteDoc(doc(db, 'houses', houseId));
            setSelectedHouse(null);
        }
    };

    const handleUpdateStatus = async (houseId, status) => {
        await updateDoc(doc(db, 'houses', houseId), { status });
    };

    const handleUserAction = async (action, userId) => {
        if (action === 'approve') {
            await updateDoc(doc(db, 'users', userId), { status: 'active' });
        } else if (action === 'delete') {
            if (window.confirm('Remove this user?')) await deleteDoc(doc(db, 'users', userId));
        }
    };

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        if (editingEvent) {
            await updateDoc(doc(db, 'events', editingEvent.id), data);
        } else {
            await addDoc(collection(db, 'events'), data);
        }
        setIsEventModalOpen(false);
        setEditingEvent(null);
    };

    const handleMeetingSubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        if (editingMeeting) {
            await updateDoc(doc(db, 'meetings', editingMeeting.id), data);
        } else {
            await addDoc(collection(db, 'meetings'), { ...data, type: 'Minutes', notes: [] });
        }
        setIsMeetingModalOpen(false);
        setEditingMeeting(null);
    };

    const handleAddNote = async (meetingId) => {
        const text = noteInputs[meetingId];
        if (!text || !text.trim()) return;
        const meeting = meetings.find(m => m.id === meetingId);
        const newNote = { author: currentUser.name, text, timestamp: new Date().toISOString() };
        const updatedNotes = [...(meeting.notes || []), newNote];
        await updateDoc(doc(db, 'meetings', meetingId), { notes: updatedNotes });
        setNoteInputs({ ...noteInputs, [meetingId]: '' });
    };

    // --- MAP CLICKER ---
    function AdminMapClicker() {
        useMapEvents({
            click(e) {
                if (isAddingHouseMode) {
                    setNewHousePos({ lat: e.latlng.lat, lng: e.latlng.lng });
                }
            }
        });
        return isAddingHouseMode && newHousePos ? <Marker position={[newHousePos.lat, newHousePos.lng]} icon={createCustomIcon('bg-yellow-500')} /> : null;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans flex flex-col h-screen">
            {/* HEADER */}
            <header className="bg-white border-b px-4 py-3 flex justify-between items-center shadow-sm shrink-0 relative z-[500]">
                <div className="flex items-center">
                    <div className="bg-blue-600 p-2 rounded-lg mr-3"><Home className="w-5 h-5 text-white" /></div>
                    <div><h1 className="text-xl font-bold text-slate-800">NagarWatch</h1><p className="text-xs text-slate-500">Hi, {currentUser.name} ({currentUser.role})</p></div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500"><LogOut className="w-5 h-5" /></button>
            </header>

            {/* NAV */}
            <nav className="flex justify-around bg-white border-b text-sm font-medium text-slate-600 shrink-0 relative z-[500] overflow-x-auto">
                <button onClick={() => setActiveTab('map')} className={`flex-1 min-w-[80px] py-4 flex flex-col md:flex-row justify-center items-center gap-1 border-b-2 ${activeTab === 'map' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}><MapIcon className="w-4 h-4" /> Map</button>
                <button onClick={() => setActiveTab('events')} className={`flex-1 min-w-[80px] py-4 flex flex-col md:flex-row justify-center items-center gap-1 border-b-2 ${activeTab === 'events' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}><Calendar className="w-4 h-4" /> Events</button>
                <button onClick={() => setActiveTab('meetings')} className={`flex-1 min-w-[80px] py-4 flex flex-col md:flex-row justify-center items-center gap-1 border-b-2 ${activeTab === 'meetings' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}><Users className="w-4 h-4" /> Meetings</button>

                {currentUser.role === 'admin' && (
                    <>
                        <button onClick={() => setActiveTab('members')} className={`flex-1 min-w-[80px] py-4 flex flex-col md:flex-row justify-center items-center gap-1 border-b-2 ${activeTab === 'members' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}>
                            <UserCog className="w-4 h-4" /> Members
                            {pendingUsers.length > 0 && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block"></span>}
                        </button>
                        <button onClick={() => setActiveTab('approvals')} className={`flex-1 min-w-[80px] py-4 flex flex-col md:flex-row justify-center items-center gap-1 border-b-2 ${activeTab === 'approvals' ? 'border-blue-600 text-blue-600' : 'border-transparent'}`}>
                            <Check className="w-4 h-4" /> House Req
                            {pendingHouses.length > 0 && <span className="ml-1 w-2 h-2 bg-red-500 rounded-full inline-block"></span>}
                        </button>
                    </>
                )}
            </nav>

            {/* MAIN CONTENT */}
            <main className="flex-1 relative overflow-hidden bg-slate-100">

                {/* MAP TAB */}
                {activeTab === 'map' && (
                    <div className="h-full w-full relative z-0">
                        {/* Auto-start Add House Mode logic moved to top level */}

                        {myPendingHouse && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-100 border border-yellow-400 text-yellow-800 px-6 py-3 rounded-xl shadow-lg z-[1000] font-bold text-sm flex items-center animate-in slide-in-from-top">
                                <Clock className="w-5 h-5 mr-2" /> Your house is pending Admin approval.
                            </div>
                        )}

                        {isAddingHouseMode && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg z-[1000] font-bold text-sm animate-in slide-in-from-top flex items-center">
                                <Home className="w-5 h-5 mr-2" />
                                {currentUser.role === 'resident' ? "Welcome! Tap your house on the map to register." : "Tap map to place new house"}
                            </div>
                        )}

                        {/* Only Admin sees the manual Add House button now */}
                        {currentUser.role === 'admin' && !isAddingHouseMode && (
                            <button
                                onClick={() => { setIsAddingHouseMode(true); setSelectedHouse(null); }}
                                className="absolute top-4 left-4 bg-white text-blue-600 px-4 py-2 rounded-xl shadow-lg z-[400] font-bold text-sm flex items-center border border-blue-100 hover:bg-blue-50"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add House
                            </button>
                        )}

                        {isAddingHouseMode && (
                            <button
                                onClick={() => { setIsAddingHouseMode(false); setNewHousePos(null); }}
                                className="absolute top-4 left-4 bg-white text-red-600 px-4 py-2 rounded-xl shadow-lg z-[400] font-bold text-sm flex items-center border border-red-100 hover:bg-red-50"
                            >
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </button>
                        )}

                        <MapContainer center={[CENTER_LAT, CENTER_LNG]} zoom={18} maxBounds={MAP_BOUNDS} minZoom={17} maxZoom={22} className="h-full w-full">
                            <LayersControl position="topright">
                                <LayersControl.BaseLayer checked name="Streets"><TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} maxNativeZoom={19} maxZoom={22} /></LayersControl.BaseLayer>
                                <LayersControl.BaseLayer name="Satellite"><TileLayer url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} maxNativeZoom={19} maxZoom={22} /></LayersControl.BaseLayer>
                            </LayersControl>

                            <AdminMapClicker />

                            {houses.map(house => {
                                if (house.status === 'pending' && currentUser.role !== 'admin') return null;
                                return <Marker key={house.id} position={[house.lat, house.lng]} icon={createCustomIcon(getHouseColorClass(house.status))} eventHandlers={{ click: () => { if (!isAddingHouseMode) { setSelectedHouse(house); setIsEditingHouse(false); } } }} />;
                            })}
                        </MapContainer>

                        {!isAddingHouseMode && (
                            <div className="absolute bottom-6 left-4 right-4 bg-white/95 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 z-[400] flex gap-4 overflow-x-auto">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs">Occupied</span></div>
                                {(currentUser.role === 'admin' || currentUser.role === 'association') && <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-xs font-bold text-rose-700">Away</span></div>}
                            </div>
                        )}

                        {isAddingHouseMode && newHousePos && (
                            <div className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-[1000] animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
                                <form onSubmit={handleAdminAddHouse} className="space-y-4">
                                    <div className="flex justify-between items-center"><h3 className="font-bold text-slate-800 text-lg">New House Details</h3></div>

                                    {/* House Type Selection */}
                                    <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-xl">
                                        {['apartment', 'single_villa', 'multi_villa'].map(type => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setFormHouseType(type)}
                                                className={`py-2 px-1 rounded-lg text-xs font-bold capitalize transition-all ${formHouseType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {type.replace('_', ' ')}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Common Fields */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <input name="number" required placeholder="House No" className="border p-3 rounded-xl w-full bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        <input name="ownerName" required placeholder="Owner Name" className="border p-3 rounded-xl w-full bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>

                                    {/* Type Specific Fields */}
                                    {formHouseType === 'apartment' && (
                                        <div className="grid grid-cols-2 gap-3 animate-in fade-in">
                                            <input name="apartmentName" placeholder="Apartment Name" className="border p-3 rounded-xl w-full bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                            <input name="blockName" placeholder="Block Name/No" className="border p-3 rounded-xl w-full bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    )}

                                    {formHouseType === 'multi_villa' && (
                                        <div className="animate-in fade-in">
                                            <input name="floorNumber" placeholder="Floor Number" className="border p-3 rounded-xl w-full bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    )}

                                    {/* Status Selection */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase">Property Status</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['occupied', 'vacant_rent', 'vacant_sale'].map(status => (
                                                <button
                                                    key={status}
                                                    type="button"
                                                    onClick={() => setFormStatus(status)}
                                                    className={`py-2 px-2 rounded-lg text-xs font-bold capitalize border transition-all ${formStatus === status ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {status.replace('vacant_', 'For ')}
                                                </button>
                                            ))}
                                        </div>
                                        <input type="hidden" name="status" value={formStatus} />
                                    </div>

                                    {/* Status Specific Fields */}
                                    {formStatus === 'occupied' ? (
                                        <div className="space-y-3 animate-in fade-in bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase">Resident Details</h4>
                                            <input name="headOfFamily" placeholder="Head of Family Name" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input name="occupants" type="number" placeholder="No. of Occupants" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                                <input name="residentPhone" placeholder="Resident Phone" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 animate-in fade-in bg-blue-50 p-3 rounded-xl border border-blue-100">
                                            <h4 className="text-xs font-bold text-blue-400 uppercase">Listing Details ({formStatus === 'vacant_rent' ? 'Rent' : 'Sale'})</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input name="ageOfBuilding" placeholder="Age of Building" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                                {formStatus === 'vacant_rent' ? (
                                                    <input name="monthlyRent" placeholder="Monthly Rent" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                                ) : (
                                                    <input name="price" placeholder="Listing Price" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                                )}
                                            </div>
                                            {formStatus === 'vacant_rent' && (
                                                <input name="deposit" placeholder="Initial Deposit" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                            )}
                                            <input name="contactPhone" placeholder="Contact Phone (Agent/Owner)" className="border p-3 rounded-xl w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                                            <textarea name="notes" placeholder="Additional Notes (Optional)" className="border p-3 rounded-xl w-full bg-white h-20 focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                                        </div>
                                    )}

                                    <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95">
                                        Add House to Map
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                )}

                {/* EVENTS TAB */}
                {activeTab === 'events' && (
                    <div className="p-4 overflow-y-auto h-full space-y-4 max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-bold text-slate-700">Community Events</h2>
                            {currentUser.role === 'admin' && (
                                <button onClick={() => { setEditingEvent(null); setIsEventModalOpen(true); }} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center shadow-sm">
                                    <Plus className="w-3 h-3 mr-1" /> Add Event
                                </button>
                            )}
                        </div>
                        {events.map(event => (
                            <div key={event.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex gap-4 group">
                                <div className="bg-orange-50 text-orange-600 rounded-lg p-3 text-center min-w-[70px] flex flex-col justify-center">
                                    <div className="text-2xl font-bold">{new Date(event.date).getDate()}</div>
                                    <div className="text-xs font-bold uppercase">{new Date(event.date).toLocaleString('default', { month: 'short' })}</div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800 text-lg">{event.title}</h3>
                                        {currentUser.role === 'admin' && (
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingEvent(event); setIsEventModalOpen(true); }} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => { if (window.confirm('Delete event?')) deleteDoc(doc(db, 'events', event.id)) }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">{event.location} &bull; {event.time}</p>
                                    <p className="text-sm text-slate-600 mt-2">{event.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MEETINGS TAB */}
                {activeTab === 'meetings' && (
                    <div className="p-4 overflow-y-auto h-full space-y-6 max-w-2xl mx-auto">
                        {currentUser.role === 'admin' && (
                            <div className="flex justify-end">
                                <button onClick={() => { setEditingMeeting(null); setIsMeetingModalOpen(true); }} className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg flex items-center hover:bg-black">
                                    <Plus className="w-3 h-3 mr-1" /> New Meeting Record
                                </button>
                            </div>
                        )}
                        {meetings.map(m => (
                            <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                                    <div>
                                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{m.date}</span>
                                        <h3 className="text-lg font-bold text-slate-800 mt-1">{m.title}</h3>
                                        <p className="text-sm text-slate-600 mt-2 italic">"{m.content}"</p>
                                    </div>
                                    {currentUser.role === 'admin' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => { setEditingMeeting(m); setIsMeetingModalOpen(true); }} className="text-blue-500 p-1"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => { if (window.confirm('Delete meeting?')) deleteDoc(doc(db, 'meetings', m.id)) }} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-5 bg-white">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center"><MessageSquare className="w-3 h-3 mr-1" /> Discussion Notes</h4>
                                    <div className="space-y-3 mb-4">
                                        {m.notes && m.notes.length > 0 ? (
                                            m.notes.map((note, idx) => (
                                                <div key={idx} className="text-sm">
                                                    <span className="font-bold text-slate-700">{note.author}: </span>
                                                    <span className="text-slate-600">{note.text}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No notes added yet.</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                        <input
                                            type="text"
                                            placeholder="Add a point or update..."
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                            value={noteInputs[m.id] || ''}
                                            onChange={(e) => setNoteInputs({ ...noteInputs, [m.id]: e.target.value })}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddNote(m.id)}
                                        />
                                        <button onClick={() => handleAddNote(m.id)} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* MEMBERS TAB */}
                {activeTab === 'members' && (
                    <div className="p-4 overflow-y-auto h-full max-w-2xl mx-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-slate-800">User Management</h2>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Active Members</h3>
                            {users.filter(u => u.status === 'active').map(u => (
                                <div key={u.id} className="bg-white border p-4 rounded-xl flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-full ${u.role === 'admin' ? 'bg-slate-100 text-slate-600' : u.role === 'association' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {u.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800">{u.name} {u.id === currentUser.uid && '(You)'}</div>
                                            <div className="text-xs text-slate-500 capitalize">@{u.username} &bull; {u.role}</div>
                                        </div>
                                    </div>
                                    {u.role !== 'admin' && (
                                        <button onClick={() => handleUserAction('delete', u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* APPROVALS TAB */}
                {activeTab === 'approvals' && (
                    <div className="p-4 overflow-y-auto h-full max-w-2xl mx-auto">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">House Requests ({pendingHouses.length})</h2>
                        {pendingHouses.length === 0 ? <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed">No pending houses.</div> : (
                            <div className="space-y-3">{pendingHouses.map(h => (
                                <div key={h.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-3"><div><h3 className="font-bold text-lg text-slate-800">{h.number}</h3><p className="text-sm text-slate-500">Owner: {h.ownerName}</p></div><span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">PENDING</span></div>
                                    <div className="flex gap-3"><button onClick={() => handleUpdateStatus(h.id, 'occupied')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold flex items-center justify-center"><Check className="w-4 h-4 mr-2" /> Approve</button><button onClick={() => handleDeleteHouse(h.id)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-bold flex items-center justify-center"><X className="w-4 h-4 mr-2" /> Reject</button></div>
                                </div>
                            ))}</div>
                        )}

                        <h2 className="text-xl font-bold text-slate-800 mb-4 mt-8">User Requests ({pendingUsers.length})</h2>
                        {pendingUsers.length === 0 ? <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed">No pending users.</div> : (
                            <div className="space-y-2">
                                {pendingUsers.map(u => (
                                    <div key={u.id} className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex justify-between items-center">
                                        <div><div className="font-bold">{u.name}</div><div className="text-xs text-slate-500">@{u.username} (Resident)</div></div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUserAction('approve', u.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Approve</button>
                                            <button onClick={() => handleUserAction('delete', u.id)} className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg text-xs font-bold">Reject</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* --- POPUPS & MODALS --- */}
            {isEventModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleEventSubmit} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in">
                        <h2 className="text-xl font-bold mb-4">{editingEvent ? 'Edit Event' : 'New Event'}</h2>
                        <div className="space-y-3">
                            <input name="title" required placeholder="Event Title" defaultValue={editingEvent?.title} className="w-full border p-2 rounded-lg" />
                            <div className="grid grid-cols-2 gap-2">
                                <input name="date" type="date" required defaultValue={editingEvent?.date} className="w-full border p-2 rounded-lg" />
                                <input name="time" type="time" required defaultValue={editingEvent?.time} className="w-full border p-2 rounded-lg" />
                            </div>
                            <input name="location" required placeholder="Location" defaultValue={editingEvent?.location} className="w-full border p-2 rounded-lg" />
                            <textarea name="desc" required placeholder="Description" defaultValue={editingEvent?.desc} className="w-full border p-2 rounded-lg h-24"></textarea>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setIsEventModalOpen(false)} className="flex-1 text-slate-500 font-bold">Cancel</button>
                            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold">Save</button>
                        </div>
                    </form>
                </div>
            )}

            {isMeetingModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <form onSubmit={handleMeetingSubmit} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-xl animate-in fade-in zoom-in">
                        <h2 className="text-xl font-bold mb-4">{editingMeeting ? 'Edit Meeting' : 'New Meeting Log'}</h2>
                        <div className="space-y-3">
                            <input name="title" required placeholder="Meeting Title" defaultValue={editingMeeting?.title} className="w-full border p-2 rounded-lg" />
                            <input name="date" type="date" required defaultValue={editingMeeting?.date} className="w-full border p-2 rounded-lg" />
                            <textarea name="content" required placeholder="Summary/Minutes..." defaultValue={editingMeeting?.content} className="w-full border p-2 rounded-lg h-32"></textarea>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button type="button" onClick={() => setIsMeetingModalOpen(false)} className="flex-1 text-slate-500 font-bold">Cancel</button>
                            <button type="submit" className="flex-1 bg-slate-800 text-white py-2 rounded-lg font-bold">Save Record</button>
                        </div>
                    </form>
                </div>
            )}

            {selectedHouse && (
                <div className="fixed inset-0 bg-black/50 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setSelectedHouse(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>

                        {/* --- EDIT MODE (ADMIN) --- */}
                        {isEditingHouse ? (
                            <form onSubmit={handleAdminEditHouse} className="space-y-3">
                                <h2 className="text-xl font-bold mb-2">Edit House</h2>
                                <input name="number" defaultValue={selectedHouse.number} placeholder="House No" className="w-full border p-2 rounded" />
                                <input name="ownerName" defaultValue={selectedHouse.ownerName} placeholder="Owner" className="w-full border p-2 rounded" />
                                <div className="grid grid-cols-2 gap-2">
                                    <input name="occupants" defaultValue={selectedHouse.occupants} placeholder="Occupants" className="w-full border p-2 rounded" />
                                    <input name="contact" defaultValue={selectedHouse.contact} placeholder="Contact" className="w-full border p-2 rounded" />
                                </div>
                                <select name="status" defaultValue={selectedHouse.status} className="w-full border p-2 rounded">
                                    <option value="occupied">Occupied</option>
                                    <option value="vacant_rent">For Rent</option>
                                    <option value="vacant_sale">For Sale</option>
                                    <option value="away">Away</option>
                                    <option value="pending">Pending</option>
                                </select>
                                <div className="flex gap-2 pt-2">
                                    <button type="button" onClick={() => setIsEditingHouse(false)} className="flex-1 text-slate-500">Cancel</button>
                                    <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded font-bold">Save</button>
                                </div>
                            </form>
                        ) : (
                            /* --- VIEW MODE --- */
                            <>
                                <div className="flex justify-between items-start pr-8">
                                    <div>
                                        <h2 className="text-2xl font-bold mb-1">{selectedHouse.number}</h2>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-bold uppercase ${selectedHouse.type === 'apartment' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>{selectedHouse.type}</span>
                                            <p className="text-slate-500 text-sm capitalize">{selectedHouse.status.replace('_', ' ')}</p>
                                        </div>
                                    </div>
                                    {currentUser.role === 'admin' && (
                                        <button onClick={() => setIsEditingHouse(true)} className="text-blue-500 bg-blue-50 p-2 rounded-lg hover:bg-blue-100">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-3 bg-slate-50 p-4 rounded-xl mb-4 mt-4">
                                    <div className="flex justify-between text-sm"><span className="text-slate-500">Owner</span><span className="font-medium">{selectedHouse.ownerName}</span></div>
                                    {(currentUser.role === 'admin' || currentUser.role === 'association') && (
                                        <><div className="flex justify-between text-sm"><span className="text-slate-500">Mobile</span><span className="font-medium">{selectedHouse.contact}</span></div>
                                            <div className="flex justify-between text-sm"><span className="text-slate-500">Occupants</span><span className="font-medium">{selectedHouse.occupants}</span></div></>
                                    )}
                                </div>
                                {currentUser.role === 'admin' && (
                                    <div className="space-y-3">
                                        {selectedHouse.status === 'pending' && <button onClick={() => { handleUpdateStatus(selectedHouse.id, 'occupied'); setSelectedHouse(null); }} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold">Approve Request</button>}
                                        <button onClick={() => handleDeleteHouse(selectedHouse.id)} className="w-full border-2 border-red-100 text-red-600 hover:bg-red-50 py-3 rounded-xl font-bold flex items-center justify-center"><Trash2 className="w-4 h-4 mr-2" /> Remove House</button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
