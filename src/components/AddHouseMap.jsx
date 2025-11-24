import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

// --- CONSTANTS ---
const CENTER_LAT = 12.904751;
const CENTER_LNG = 80.157509;
const MAP_BOUNDS = [[12.901000, 80.154000], [12.909000, 80.161000]];

const createCustomIcon = (colorClass) => {
    // Simplified icon creation for this component
    const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#eab308" stroke="white" stroke-width="2" class="w-8 h-8 drop-shadow-md">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>
  `;
    return L.divIcon({ html: svgHtml, className: '', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });
};

const AddHouseMap = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [selectedPos, setSelectedPos] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState({
        type: 'villa',
        block: '',
        number: '',
        ownerName: currentUser?.name || '',
        occupants: '',
        contact: ''
    });

    function MapClicker() {
        useMapEvents({ click(e) { setSelectedPos({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
        return selectedPos ? <Marker position={[selectedPos.lat, selectedPos.lng]} icon={createCustomIcon('bg-yellow-500')} /> : null;
    }

    const validateName = (name) => /^[A-Za-z\s]+$/.test(name);
    const validatePhone = (phone) => /^\d{10}$/.test(phone);

    const handleValidateAndSubmit = async () => {
        setError('');
        setLoading(true);

        // 1. Check Regex
        if (!validateName(details.ownerName)) { setLoading(false); return setError("Owner Name must contain alphabets only."); }
        if (!validatePhone(details.contact)) { setLoading(false); return setError("Phone Number must be exactly 10 digits."); }
        if (!details.number) { setLoading(false); return setError("House Number is required."); }
        if (details.type === 'apartment' && !details.block) { setLoading(false); return setError("Block Name is required for Apartments."); }

        try {
            // 2. Check Duplicates in Firestore
            const housesRef = collection(db, 'houses');
            // Ideally we should have a composite index or check logic here. 
            // For MVP, we'll fetch all houses (optimize later) or query by number.
            // A simple query by number is a good start.
            const q = query(housesRef, where("number", "==", details.number));
            const querySnapshot = await getDocs(q);

            let isDuplicate = false;
            querySnapshot.forEach((doc) => {
                const h = doc.data();
                if (details.type === 'apartment') {
                    if (h.type === 'apartment' && h.block?.toLowerCase() === details.block.toLowerCase()) isDuplicate = true;
                } else {
                    if (h.type !== 'apartment') isDuplicate = true;
                }
            });

            if (isDuplicate) {
                setLoading(false);
                return setError(`House ${details.number} is already registered.`);
            }

            // 3. Final formatting
            const finalNumber = details.type === 'apartment' ? `${details.block}-${details.number}` : details.number;

            // 4. Save to Firestore
            await addDoc(collection(db, 'houses'), {
                ...details,
                number: finalNumber,
                lat: selectedPos.lat,
                lng: selectedPos.lng,
                userId: currentUser.uid,
                status: 'pending', // Initial status
                createdAt: new Date().toISOString()
            });

            // Update user status or redirect
            navigate('/');

        } catch (err) {
            console.error(err);
            setError("Failed to save house: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col relative bg-slate-100">
            <div className="bg-blue-600 text-white p-4 shadow-md z-20">
                <h2 className="font-bold text-lg">Locate Your House</h2>
                <p className="text-blue-100 text-xs">Tap map to place pin. Enter details accurately.</p>
            </div>
            <div className="flex-1 relative z-10">
                <MapContainer
                    center={[CENTER_LAT, CENTER_LNG]}
                    zoom={18}
                    maxBounds={MAP_BOUNDS}
                    minZoom={17}
                    maxZoom={22}
                    className="h-full w-full"
                >
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Streets"><TileLayer url="http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} maxNativeZoom={19} maxZoom={22} /></LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite"><TileLayer url="http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} maxNativeZoom={19} maxZoom={22} /></LayersControl.BaseLayer>
                    </LayersControl>
                    <MapClicker />
                </MapContainer>

                <div className="absolute bottom-0 left-0 right-0 bg-white p-6 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)] z-[1000] animate-in slide-in-from-bottom duration-300 max-h-[60vh] overflow-y-auto">
                    {!selectedPos ? (
                        <div className="text-center py-4"><p className="text-slate-600 font-medium">👇 Tap map exactly where your house is.</p></div>
                    ) : (
                        <div className="space-y-3">
                            {error && <div className="bg-red-50 text-red-600 p-2 text-xs rounded border border-red-200">{error}</div>}

                            {/* Property Type Selector */}
                            <div>
                                <label className="text-xs font-bold text-slate-500">Property Type</label>
                                <div className="flex gap-2 mt-1">
                                    {['villa', 'apartment', 'multi-villa'].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setDetails({ ...details, type: t })}
                                            className={`flex-1 py-2 text-xs rounded-lg border ${details.type === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                                        >
                                            {t === 'multi-villa' ? 'Multi-Villa' : t.charAt(0).toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dynamic Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                {details.type === 'apartment' && (
                                    <input placeholder="Block (e.g. A)" className="border p-3 rounded-xl w-full" value={details.block} onChange={e => setDetails({ ...details, block: e.target.value })} />
                                )}
                                <input placeholder={details.type === 'apartment' ? "Flat No" : "House No"} className="border p-3 rounded-xl w-full" value={details.number} onChange={e => setDetails({ ...details, number: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <input placeholder="Owner Name (Letters)" className="border p-3 rounded-xl w-full" value={details.ownerName} onChange={e => setDetails({ ...details, ownerName: e.target.value })} />
                                <input placeholder="10-digit Mobile" className="border p-3 rounded-xl w-full" value={details.contact} onChange={e => setDetails({ ...details, contact: e.target.value })} />
                            </div>
                            <input type="number" placeholder="Number of Occupants" className="border p-3 rounded-xl w-full" value={details.occupants} onChange={e => setDetails({ ...details, occupants: e.target.value })} />

                            <button onClick={handleValidateAndSubmit} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl">
                                {loading ? 'Submitting...' : 'Submit House'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddHouseMap;
