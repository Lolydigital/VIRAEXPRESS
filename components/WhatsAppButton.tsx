import React, { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const WhatsAppButton: React.FC = () => {
    const [whatsappNumber, setWhatsappNumber] = useState('5511999999999');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        loadWhatsAppConfig();
    }, []);

    const loadWhatsAppConfig = async () => {
        try {
            const { data } = await supabase
                .from('app_config')
                .select('*')
                .eq('key', 'whatsapp')
                .single();

            if (data?.value?.number) {
                setWhatsappNumber(data.value.number);
            }
        } catch (err) {
            console.error('Error loading WhatsApp config:', err);
        }
    };

    const openWhatsApp = () => {
        const message = encodeURIComponent('Olá! Preciso de ajuda com o ViraExpress');
        const url = `https://wa.me/${whatsappNumber}?text=${message}`;
        window.open(url, '_blank');
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={openWhatsApp}
                className="fixed bottom-8 right-8 z-50 w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
                aria-label="Suporte WhatsApp"
            >
                <MessageCircle className="w-8 h-8 text-white group-hover:rotate-12 transition-transform" />

                {/* Tooltip */}
                <div className="absolute bottom-20 right-0 bg-black/90 text-white px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Precisa de ajuda?
                </div>
            </button>
        </>
    );
};
