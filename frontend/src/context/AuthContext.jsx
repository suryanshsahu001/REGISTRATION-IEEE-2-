import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = async (authId) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
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
                setUser({
                    ...data,
                    team_member_of: data.team,
                    team_id_num: data.team_id
                });
            } else {
                setUser(null);
            }
        } catch (err) {
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
            if (session?.user) {
                fetchUserProfile(session.user.id);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, loading, checkAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
