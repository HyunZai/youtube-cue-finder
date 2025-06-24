import React from 'react';

function SelectedChannel({ channelInfo, handleResetChannel }) {
  return (
    <div className="selected-channel-wrapper">
      <div className="selected-channel-header">
        <h3 className="selected-channel-title">✅ 선택된 채널</h3>
        <button onClick={handleResetChannel} className="change-channel-button">채널 변경</button>
      </div>
      <div className="channel-search-result-item selected">
        <img src={channelInfo.thumbnail} alt="채널 썸네일" className="channel-search-result-thumbnail" />
        <div className="channel-search-result-info">
          <div className="channel-search-result-name">{channelInfo.name}</div>
          <div className="channel-search-result-description">{channelInfo.description}</div>
          <a href={channelInfo.url} target="_blank" rel="noopener noreferrer" className="channel-search-result-link" onClick={e => e.stopPropagation()}>
            채널 바로가기
          </a>
        </div>
      </div>
    </div>
  );
}

export default SelectedChannel; 