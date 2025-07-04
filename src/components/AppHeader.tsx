// src/components/AppHeader.tsx
import * as React from 'react';import './AppHeader.css';
import { useTranslation } from 'react-i18next';

const AppHeader: React.FC = () => {

  const { i18n } = useTranslation();

  const changeLanguage = (lang: 'en' | 'kn') => {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);

    console.log('[🌐] Language changed to:', lang);
  };
  
  return (
    <>
        {/* Header with language selection */}
        <header className="home-header">
        <div className="home-language-bar">
          <button
            className={`home-language-btn${i18n.language === 'en' ? ' active' : ''}`}
            onClick={() => changeLanguage('en')}
          >
            English
          </button>
          <button
            className={`home-language-btn${i18n.language === 'kn' ? ' active' : ''}`}
            onClick={() => changeLanguage('kn')}
          >
            Kannada
          </button>
        </div>
        </header>
    </>
  );
};

export default AppHeader;
