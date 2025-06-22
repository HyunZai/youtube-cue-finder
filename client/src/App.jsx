import { useState, useEffect } from 'react'
import './App.css'
import axios from 'axios'

function App() {
  // State for channel input and type
  const [channelInput, setChannelInput] = useState('')
  const [channelInfo, setChannelInfo] = useState(null) // For channel info if found by URL
  const [cueWord, setCueWord] = useState('')
  const [searchedVideos, setSearchedVideos] = useState([])
  const [searchMode, setSearchMode] = useState('') // 'url' or 'name'
  const [channelSearchResults, setChannelSearchResults] = useState([]) // for name search results
  const [isSearching, setIsSearching] = useState(false) // 검색 중인지 여부
  const [currentSearchChannelId, setCurrentSearchChannelId] = useState(null); // 현재 검색 중인 채널 ID
  const [nextPageToken, setNextPageToken] = useState(null); // 다음 페이지 토큰
  const [hasMoreVideos, setHasMoreVideos] = useState(true); // 더 검색할 영상이 있는지 여부
  const [currentBatchCompleted, setCurrentBatchCompleted] = useState(false); // 현재 50개 영상 검색 완료 여부

  // 페이지 새로고침이나 브라우저 닫기 시 검색 상태 초기화
  useEffect(() => {
    const handleBeforeUnload = () => {
      // beforeunload에서는 상태 변경이 무의미하므로 제거
      // 페이지를 떠날 때는 브라우저가 모든 것을 정리함
    };

    // 페이지 새로고침이나 브라우저 닫기 이벤트 리스너 추가
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []); // 의존성 배열을 빈 배열로 변경

  // 한글이 포함된 @핸들 URL인지 확인하는 함수
  const hasKoreanInHandle = (input) => {
    const handleMatch = input.match(/youtube\.com\/(?:@|user\/)([^/?]+)/u);
    if (handleMatch) {
      const handle = handleMatch[1];
      // URL 디코딩 후 한글 정규식: 가-힣 (한글 유니코드 범위)
      const decodedHandle = decodeURIComponent(handle);
      return /[가-힣]/.test(decodedHandle);
    }
    return false;
  };

  // Handle channel input submit
  const handleChannelSearch = async () => {
    // 한글이 포함된 @핸들 URL인지 확인
    if (hasKoreanInHandle(channelInput)) {
      alert('해당 URL은 검색이 불가합니다. 유튜브에서 제공하는 채널 공유를 통해 복사된 URL 혹은 채널명으로 검색해주세요.');
      return;
    }

    try {
      const res = await axios.get('/api/channel-search', { params: { query: channelInput } });
      if (res.data.channelInfo) {
        setChannelInfo(res.data.channelInfo);
        setSearchMode('url');
        setChannelSearchResults([]);
      } else if (res.data.results) {
        setChannelSearchResults(res.data.results);
        setSearchMode('name');
        setChannelInfo(null);
      }
    } catch {
      setChannelInfo(null);
      setChannelSearchResults([]);
      alert('채널 검색 중 오류가 발생했습니다.');
    }
  }

  // Handle cue word search (dummy)
  const handleCueSearch = async (isContinueSearch = false) => {
    if (!channelInfo || !cueWord) {
      alert('채널과 검색어를 모두 입력해주세요.');
      return;
    }
    
    try {
      // 새로운 검색인 경우 결과 초기화 및 로딩 상태 설정
      if (!isContinueSearch) {
        setSearchedVideos([]);
        setNextPageToken(null);
        setHasMoreVideos(true);
        setCurrentBatchCompleted(false);
      }
      
      setIsSearching(true);
      setCurrentSearchChannelId(channelInfo.id); // 현재 검색 중인 채널 ID 설정
      
      // 채널의 영상 목록을 가져오기 (페이지네이션 토큰 사용)
      const params = new URLSearchParams();
      params.append('channelId', channelInfo.id);
      if (nextPageToken) {
        params.append('pageToken', nextPageToken);
      }
      
      const channelVideosRes = await axios.get(`/api/channel-videos?${params.toString()}`);
      const allVideos = channelVideosRes.data.videos || [];
      const newNextPageToken = channelVideosRes.data.nextPageToken;
      
      // 다음 페이지 토큰 업데이트
      setNextPageToken(newNextPageToken);
      setHasMoreVideos(!!newNextPageToken);
      
      console.log('🔍 검색 상태:', {
        isContinueSearch,
        hasMoreVideos: !!newNextPageToken,
        nextPageToken: newNextPageToken,
        videosCount: allVideos.length
      });
      
      // 각 영상별로 자막 검색을 개별적으로 수행
      for (let i = 0; i < allVideos.length; i++) {
        const video = allVideos[i];
        
        // 검색 중에 채널이 변경되었는지 확인 (계속 검색 시에는 체크하지 않음)
        if (!isContinueSearch && currentSearchChannelId !== channelInfo.id) {
          return;
        }
        
        try {
          const transcriptRes = await axios.get(`/api/check-transcript`, {
            params: {
              videoId: video.videoId,
              query: cueWord,
              order: i + 1  // 1부터 시작하는 순번 추가
            }
          });
          
          // 검색 중에 채널이 변경되었는지 다시 확인 (계속 검색 시에는 체크하지 않음)
          if (!isContinueSearch && currentSearchChannelId !== channelInfo.id) {
            return;
          }
          
          // 매칭되는 영상이면 즉시 결과에 추가
          if (transcriptRes.data.matched) {
            setSearchedVideos(prev => {
              // 이미 추가된 영상인지 확인
              const isDuplicate = prev.some(existingVideo => existingVideo.videoId === video.videoId);
              if (isDuplicate) {
                return prev; // 중복이면 기존 배열 그대로 반환
              }
              return [...prev, {
                videoId: video.videoId,
                title: video.title,
                publishedAt: video.publishedAt,
                thumbnail: video.thumbnail,
              }];
            });
          }
        } catch {
          // 자막을 가져올 수 없는 경우 무시하고 계속 진행
        }
      }
      
      // 현재 배치의 모든 영상 검색이 완료됨
      setCurrentBatchCompleted(true);
      
      console.log('✅ 검색 완료 상태:', {
        isContinueSearch,
        hasMoreVideos: !!newNextPageToken,
        currentBatchCompleted: true
      });
      
      // 검색 완료 처리
      if (!newNextPageToken) {
        // 더 이상 검색할 영상이 없으면 검색 완료
        console.log('🏁 모든 검색 완료 - isSearching 해제');
        setIsSearching(false);
        setCurrentSearchChannelId(null);
        setHasMoreVideos(false);
      } else {
        // 다음 배치가 있으면 검색 중단 (사용자가 계속 검색하기 버튼을 눌러야 함)
        console.log('⏸️ 배치 검색 완료 - isSearching 해제, 계속 검색 대기');
        setIsSearching(false);
        setCurrentSearchChannelId(null);
        // hasMoreVideos는 true로 유지 (다음 배치가 있음을 표시)
      }
      
    } catch (error) {
      console.error('영상 검색 중 오류가 발생했습니다:', error);
      alert('영상 검색 중 오류가 발생했습니다.');
      setIsSearching(false);
      setCurrentSearchChannelId(null);
    }
  };

  // 채널명 검색 결과에서 채널을 선택하면 channelInfo로 설정
  const handleSelectChannel = (ch) => {
    setChannelInfo(ch);
    setChannelSearchResults([]);
    setSearchMode('url'); // 선택 시 url 모드로 전환(정보만 보여줌)
  };

  // 채널 선택을 리셋하는 함수
  const handleResetChannel = () => {
    setChannelInfo(null);
    setChannelInput('');
    setSearchMode('');
    setSearchedVideos([]);
    setIsSearching(false);
    setCueWord(''); // 검색어도 초기화
    setCurrentSearchChannelId(null); // 검색 중인 채널 ID도 초기화
    setNextPageToken(null); // 페이지네이션 토큰 초기화
    setHasMoreVideos(true); // 더 검색할 영상이 있는지 여부 초기화
    setCurrentBatchCompleted(false); // 현재 배치 검색 완료 여부 초기화
  };

  return (
    <div className="app-container">
      <h1 className="app-title">유튜브 영상 찾기</h1>
      
      {/* 1단계: 채널 선택 */}
      {!channelInfo ? (
        <div className="channel-search-wrapper">
          <h3>유튜브 채널명이나 채널 URL을 입력하세요.</h3>
          <div style={{ marginBottom: 16 }}>
            <div className="search-container">
              <input
                type="text"
                value={channelInput}
                onChange={e => setChannelInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleChannelSearch()}
                placeholder="채널명 또는 https://youtube.com/@..."
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
          {searchMode === 'name' && channelSearchResults.length > 0 && (
            <div className="channel-search-results">
              <p>영상을 검색할 채널을 선택하세요.</p>
              <ul className="channel-search-results-list">
                {channelSearchResults.map((ch, idx) => (
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
      ) : (
        // 채널이 선택된 후
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
      )}

      {/* 2단계: 단서로 검색 */}
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

      {/* 검색 결과 */}
      {isSearching && searchedVideos.length === 0 && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">영상을 검색하고 있습니다...</div>
        </div>
      )}

      {searchedVideos.length > 0 && (
        <div className="search-results-container">
          <h3 className="search-results-title">단서 검색 결과 ({searchedVideos.length}개)</h3>
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
              <div className="loading-spinner"></div>
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
      )}
    </div>
  );
}

export default App;
