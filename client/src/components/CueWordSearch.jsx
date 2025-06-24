import React from 'react';

function CueWordSearch({ channelInfo, cueWord, setCueWord, handleCueSearch }) {
  return (
    <div className={`cue-word-search-wrapper ${!channelInfo ? 'disabled' : ''}`}>
      <h3>찾고 싶은 영상에서 나왔던 말을 입력하세요.</h3>
      <div className="search-container">
        <input
          type="text"
          value={cueWord}
          onChange={e => setCueWord(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCueSearch()}
          placeholder={channelInfo ? "예: 오늘도 화이팅" : "채널을 먼저 선택해주세요"}
          className="search-input"
          disabled={!channelInfo}
        />
        <button
          onClick={() => handleCueSearch(false)}
          className="search-button"
          disabled={!channelInfo}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default CueWordSearch; 