import React from 'react';
import LoadingSpinner from './LoadingSpinner';

function SearchResults({ searchedVideos, isSearching, currentBatchCompleted, hasMoreVideos, handleCueSearch }) {
  return (
    <div className="search-results-container">
      <h3 className="search-results-title">검색 결과 ({searchedVideos.length}개)</h3>
      <ul className="search-results-list">
        {searchedVideos.map((video) => (
          <li key={video.videoId} className="search-result-item">
            <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">
              <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
            </a>
            <div className="video-info">
              <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" className="video-title">
                <p>{video.title}</p>
              </a>
              <p className="video-date">
                {new Date(video.publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {isSearching && (
        <div className="searching-more">
          <span>계속 찾는 중...</span>
          <LoadingSpinner />
        </div>
      )}
      {!isSearching && currentBatchCompleted && hasMoreVideos && (
        <div className="continue-search">
          <button 
            onClick={() => handleCueSearch(true)}
            className="continue-search-button"
          >
            계속 검색하기
          </button>
        </div>
      )}
      {!isSearching && !hasMoreVideos && searchedVideos.length > 0 && (
        <div className="search-completed">
          <p>모든 영상 검색이 완료되었습니다.</p>
        </div>
      )}
      {!isSearching && !hasMoreVideos && searchedVideos.length === 0 && (
        <div className="search-completed">
          <p>검색할 영상이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default SearchResults; 