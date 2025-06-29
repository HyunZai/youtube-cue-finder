import React from 'react';

function ChannelSearch({ channelInput, setChannelInput, handleChannelSearch, searchMode, searchedChannel, handleSelectChannel }) {
  return (
    <div className="channel-search-wrapper">
      <h3>유튜브 채널명이나 채널 URL을 입력하세요.</h3>
      <div style={{ marginBottom: 16 }}>
        <div className="search-container">
          <input
            type="text"
            value={channelInput}
            onChange={e => setChannelInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleChannelSearch();
              }
            }}
            placeholder="채널명 또는 https://youtube.com/@Channel_ID"
            className="search-input"
          />
          <button onClick={handleChannelSearch} className="search-button">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
        </div>
      </div>
      {/* 채널명으로 검색했을 때 결과 표시 */}
      {searchMode === 'name' && searchedChannel.length > 0 && (
        <div className="channel-search-results">
          <p>영상을 검색할 채널을 선택하세요.</p>
          <ul className="channel-search-results-list">
            {searchedChannel.map((ch, idx) => (
              <li key={idx} className="channel-search-result-item" onClick={() => handleSelectChannel(ch)}>
                <img src={ch.thumbnail} alt="채널 썸네일" className="channel-search-result-thumbnail" />
                <div className="channel-search-result-info">
                  <div className="channel-search-result-name">{ch.name}</div>
                  <div className="channel-search-result-description">{ch.description}</div>
                  <a href={ch.url} target="_blank" rel="noopener noreferrer" className="channel-search-result-link" onClick={e => e.stopPropagation()}>
                    채널 바로가기
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ChannelSearch; 