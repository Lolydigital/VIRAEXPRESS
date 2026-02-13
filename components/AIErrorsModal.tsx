import React from 'react';
import { AlertCircle, X, RefreshCcw } from 'lucide-react';

interface AIErrorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRetry?: () => void;
    errorTitle?: string;
    errorMessage?: string;
}

export const AIErrorsModal: React.FC<AIErrorsModalProps> = ({
    isOpen,
    onClose,
    onRetry,
    errorTitle = "Problema na Conexão",
    errorMessage = "Tivemos um problema ao conectar com a IA. Tente novamente em instantes."
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#1E293B]/80 border border-white/10 rounded-[2.5rem] w-full max-w-md p-8 relative overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                {/* Background Glow */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 blur-[60px] rounded-full" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-xl shadow-red-500/5">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                            {errorTitle}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium leading-relaxed">
                            {errorMessage}
                        </p>
                    </div>

                    <div className="w-full flex flex-col gap-3 mt-4">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCcw className="w-4 h-4" />
                                Tentar Novamente
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full py-5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl border border-white/5 transition-all flex items-center justify-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
