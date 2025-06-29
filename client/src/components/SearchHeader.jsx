import React from 'react';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import logoImage from '../assets/logo.png';

function SearchHeader({ theme, handleToggleTheme }) {
  return (
    <>
      <nav className="global-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src={logoImage} alt="Logo" style={{ width: '32px', height: '32px' }} />
          <span className="global-navbar-title">YouTube Cue Finder</span>
        </div>
        <button
          className="darkmode-toggle-btn"
          onClick={handleToggleTheme}
          aria-label="다크모드 토글"
        >
          {theme === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
        </button>
      </nav>
      <div className="global-footer">
        © 2025 YouTube Cue Finder
      </div>
    </>
  );
}

export default SearchHeader; 