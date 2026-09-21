import React, { createContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // Track if we are in the middle of an isolated signup (adding a member)
    // so we don't react to the onAuthStateChange event it fires
    const suppressAuthChange = useRef(false);

    const fetchUserProfile = async (authId) => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('users')
                .select(`
                    *,
                    team:teams!users_team_id_fkey (
                        id,
                        team_id,
                        name,
                        status,
                        leader_id
                    )
                `)
                .eq('id', authId)
                .single();

            if (data) {
                setUser({ ...data });
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
            await fetchUserProfile(session.user.id);
        } else {
            setUser(null);
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Skip if we are signing up an isolated member
            if (suppressAuthChange.current) return;

            if (session?.user) {
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
