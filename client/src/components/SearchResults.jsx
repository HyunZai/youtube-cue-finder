import React from 'react';
import LoadingSpinner from './LoadingSpinner';

function SearchResults({ searchedVideos, isSearching, currentBatchCompleted, hasMoreVideos, handleCueSearch }) {
  // 검색 결과가 0개이고, 계속 검색 가능한 경우 별도 안내와 버튼 노출
  if (
    !isSearching &&
    currentBatchCompleted &&
    hasMoreVideos &&
    searchedVideos.length === 0
  ) {
    return (
      <div className="search-results-container">
        <h3 className="search-results-title">검색 결과 (0개)</h3>
        <div className="search-no-result">
          <p>아직 검색된 영상이 없습니다.</p>
          <button 
            onClick={() => handleCueSearch(true)}
            className="continue-search-button"
          >
            계속 검색하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="search-results-container">
      <h3 className="search-results-title">검색 결과 ({searchedVideos.length}개)</h3>
      <ul className="search-results-list">
        {searchedVideos.map((video) => (
          <li key={video.videoId} className="search-result-item">
            <div className="thumbnail-wrapper">
              <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer">
                <img src={video.thumbnail} alt={video.title} className="video-thumbnail" />
              </a>
            </div>
            <div className="video-info">
              <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" className="video-title">
                <p>{video.title}</p>
              </a>
              <p className="video-date">
                {new Date(video.publishedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {video.trimScript && (
                <div className="trim-script-snippet">
                  <span className="trim-script-icon" role="img" aria-label="script">💬</span>
                  <span
                    className="trim-script-text"
                    dangerouslySetInnerHTML={{ __html: video.trimScript }}
                  />
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {isSearching && (
        <div>
          <div className="searching-more">
            <LoadingSpinner />
            <span>계속 찾는 중...</span>
          </div>
        </div>
      )}
      {/* 검색 결과가 있거나, 0개여도 버튼이 아래에 노출 */}
      {!isSearching && currentBatchCompleted && hasMoreVideos && searchedVideos.length > 0 && (
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