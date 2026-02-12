
import React from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  current: Language;
  onSelect: (lang: Language) => void;
  variant?: 'minimal' | 'full';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ current, onSelect, variant = 'full' }) => {
  const langs: { id: Language; flag: string }[] = [
    { id: 'PT', flag: '🇧🇷' },
    { id: 'EN', flag: '🇺🇸' },
    { id: 'ES', flag: '🇪🇸' },
  ];

  return (
    <div className={`flex gap-4 ${variant === 'full' ? 'justify-center py-4' : ''}`}>
      {langs.map((l) => (
        <button
          key={l.id}
          onClick={() => onSelect(l.id)}
          className={`text-2xl transition-transform hover:scale-125 ${
            current === l.id ? 'grayscale-0 scale-110' : 'grayscale opacity-70'
          }`}
          title={l.id}
        >
          {l.flag}
        </button>
      ))}
    </div>
  );
};
