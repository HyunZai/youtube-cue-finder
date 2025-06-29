import React from 'react';
import ChannelSearch from './ChannelSearch';
import SelectedChannel from './SelectedChannel';
import CueWordSearch from './CueWordSearch';
import SearchResults from './SearchResults';
import LoadingSpinner from './LoadingSpinner';

function SearchContainer({
  channelInput,
  setChannelInput,
  channelInfo,
  searchMode,
  searchedChannel,
  cueWord,
  setCueWord,
  searchedVideos,
  isSearching,
  currentBatchCompleted,
  hasMoreVideos,
  handleChannelSearch,
  handleSelectChannel,
  handleResetChannel,
  handleCueSearch,
}) {
  const isInitial = !channelInfo && searchedVideos.length === 0 && !isSearching;

  return (
    <div className={`app-container${isInitial ? ' center' : ''}`}>
      <h1 className="app-title">유튜브 영상 찾기</h1>
      {/* 1단계: 채널 선택 */}
      {!channelInfo ? (
        <ChannelSearch
          channelInput={channelInput}
          setChannelInput={setChannelInput}
          handleChannelSearch={handleChannelSearch}
          searchMode={searchMode}
          searchedChannel={searchedChannel}
          handleSelectChannel={handleSelectChannel}
        />
      ) : (
        <SelectedChannel
          channelInfo={channelInfo}
          handleResetChannel={handleResetChannel}
        />
      )}
      {/* 2단계: 단서로 검색 */}
      <CueWordSearch
        channelInfo={channelInfo}
        cueWord={cueWord}
        setCueWord={setCueWord}
        handleCueSearch={handleCueSearch}
      />
      {/* 검색 결과 */}
      {isSearching && searchedVideos.length === 0 && (
        <div className="loading-container">
          <LoadingSpinner />
          <div className="loading-text">영상을 검색하고 있습니다...</div>
        </div>
      )}
      {(searchedVideos.length > 0 || (!isSearching && currentBatchCompleted && hasMoreVideos)) && (
        <SearchResults
          searchedVideos={searchedVideos}
          isSearching={isSearching}
          currentBatchCompleted={currentBatchCompleted}
          hasMoreVideos={hasMoreVideos}
          handleCueSearch={handleCueSearch}
        />
      )}
    </div>
  );
}

export default SearchContainer; 