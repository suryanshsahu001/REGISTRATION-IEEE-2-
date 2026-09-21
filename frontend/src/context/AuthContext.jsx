import React, { createContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const suppressAuthChange = useRef(false);

    const fetchUserProfile = async (authId) => {
        try {
            // Simple fetch — no FK joins that can fail
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authId)
                .single();

            if (data && !error) {
                setUser(data);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const checkAuth = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                await fetchUserProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        } catch {
            setUser(null);
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (suppressAuthChange.current) return;
            if (session?.user) {
                setLoading(true);
                fetchUserProfile(session.user.id);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, checkAuth, logout, suppressAuthChange }}>
            {children}
        </AuthContext.Provider>
    );
};
