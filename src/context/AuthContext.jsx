import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeUserDoc;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Subscribe to user document for real-time updates (role, status)
                unsubscribeUserDoc = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData(data);
                        setUserRole(data.role);
                        setCurrentUser({ ...user, ...data });
                    } else {
                        // Fallback if doc doesn't exist yet (e.g. during registration)
                        setCurrentUser(user);
                        setUserRole(null);
                        setUserData(null);
                    }
                    setLoading(false);
                });
            } else {
                setCurrentUser(null);
                setUserRole(null);
                setUserData(null);
                setLoading(false);
                if (unsubscribeUserDoc) unsubscribeUserDoc();
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUserDoc) unsubscribeUserDoc();
        };
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const register = async (email, password, additionalData) => {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        // Create user document in Firestore
        await setDoc(doc(db, 'users', res.user.uid), {
            uid: res.user.uid,
            email,
            ...additionalData,
            status: 'pending', // Default status
            createdAt: new Date().toISOString()
        });
        return res;
    };

    const logout = () => {
        return signOut(auth);
    };

    const value = {
        currentUser,
        userRole,
        userData,
        login,
        register,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
