import { useEffect, useContext } from 'react'
import './App.css'
import axios from 'axios'
import ChannelSearch from './components/ChannelSearch'
import SelectedChannel from './components/SelectedChannel'
import CueWordSearch from './components/CueWordSearch'
import SearchResults from './components/SearchResults'
import LoadingSpinner from './components/LoadingSpinner'
import Swal from 'sweetalert2'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import { AppContext } from './context/AppContext'
import logoImage from './assets/logo.png'

function App() {
  const {
    theme, setTheme,
    channelInput, setChannelInput,
    channelInfo, setChannelInfo,
    searchMode, setSearchMode,
    searchedChannel, setSearchedChannel,
    currentSearchChannelId, setCurrentSearchChannelId,
    cueWord, setCueWord,
    searchedVideos, setSearchedVideos,
    isSearching, setIsSearching,
    nextPageToken, setNextPageToken,
    hasMoreVideos, setHasMoreVideos,
    currentBatchCompleted, setCurrentBatchCompleted,
    abortControllerRef,
    hasKoreanInHandle,
    extractKoreanFromHandle,
    resetAllStates,
  } = useContext(AppContext);

  // 페이지 새로고침이나 브라우저 닫기 시 검색 상태 초기화
  useEffect(() => {
    const handleBeforeUnload = async (e) => {
      if (isSearching) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSearching]);

  // 테마 변경 시 body class도 변경
  useEffect(() => {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
  }, [theme]);

  // Handle channel input submit
  const handleChannelSearch = async () => {
    if (!channelInput) {
      Swal.fire({
        icon: 'question',
        title: '검색 불가',
        html: '채널 입력란에 URL 혹은 채널명을 입력해주세요.',
        background: theme === "dark" ? '#282828' : '#fff',
        color: theme === "dark" ? '#fff' : 'black',
      });
      return;
    }

    // 한글이 포함된 @핸들 URL인지 확인
    if (hasKoreanInHandle(channelInput)) {
      // 한글 부분을 추출하여 채널명으로 검색
      const koreanChannelName = extractKoreanFromHandle(channelInput);
      if (koreanChannelName) {
        try {
          const res = await axios.get('/api/channel-search', { params: { query: koreanChannelName } });
          if (res.data.results && res.data.results.length > 0) {
            setSearchedChannel(res.data.results);
            setSearchMode('name');
            setChannelInfo(null);
            return;
          }
        } catch (error) {
          console.error('한글 채널명 검색 중 오류:', error);
        }
      }
      
      // 한글 추출 실패 또는 검색 결과가 없는 경우
      Swal.fire({
        icon: 'error',
        title: '검색 불가',
        html: '해당 URL은 검색이 불가합니다.<br>유튜브에서 제공하는 채널 공유를 통해 복사된 URL 혹은<br>채널명으로 검색해주세요.',
        background: theme === "dark" ? '#282828' : '#fff',
        color: theme === "dark" ? '#fff' : 'black',
      });
      return;
    }

    try {
      const res = await axios.get('/api/channel-search', { params: { query: channelInput } });
      if (res.data.channelInfo) {
        setChannelInfo(res.data.channelInfo);
        setSearchMode('url');
        setSearchedChannel([]);
      } else if (res.data.results) {
        setSearchedChannel(res.data.results);
        setSearchMode('name');
        setChannelInfo(null);
      }
    } catch {
      setChannelInfo(null);
      setSearchedChannel([]);
      Swal.fire({
        icon: 'error',
        title: '채널 검색 오류',
        text: '채널 검색 중 오류가 발생했습니다.',
        background: theme === "dark" ? '#282828' : '#fff',
        color: theme === "dark" ? '#fff' : 'black',
      });
    }
  }

  // Handle cue word search (dummy)
  const handleCueSearch = async (isContinueSearch = false) => {
    if (!channelInfo || !cueWord) {
      Swal.fire({
        icon: 'question',
        title: '입력 필요',
        text: '채널과 검색어를 모두 입력해주세요.',
        background: theme === "dark" ? '#282828' : '#fff',
        color: theme === "dark" ? '#fff' : 'black',
      });
      return;
    }
    try {
      // 새로운 검색인 경우 결과 초기화 및 로딩 상태 설정
      if (!isContinueSearch) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort(); // 이전 검색 중단
        }
        abortControllerRef.current = new AbortController();
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
      
      const channelVideosRes = await axios.get(`/api/channel-videos?${params.toString()}`, {
        signal: abortControllerRef.current.signal
      });
      const allVideos = channelVideosRes.data.videos || [];
      const newNextPageToken = channelVideosRes.data.nextPageToken;
      setNextPageToken(newNextPageToken);
      setHasMoreVideos(!!newNextPageToken);
      for (let i = 0; i < allVideos.length; i++) {
        const video = allVideos[i];
        if (!isContinueSearch && currentSearchChannelId !== channelInfo.id) {
          return;
        }
        try {
          const transcriptRes = await axios.get(`/api/check-transcript`, {
            params: {
              videoId: video.videoId,
              query: cueWord,
              order: i + 1  // 1부터 시작하는 순번 추가
            },
            signal: abortControllerRef.current.signal
          });
          // if (!isContinueSearch && currentSearchChannelId !== channelInfo.id) {
          //   return;
          // }
          if (transcriptRes.data.matched) {
            setSearchedVideos(prev => {
              const isDuplicate = prev.some(existingVideo => existingVideo.videoId === video.videoId);
              if (isDuplicate) {
                return prev;
              }
              return [...prev, {
                videoId: video.videoId,
                title: video.title,
                publishedAt: video.publishedAt,
                thumbnail: video.thumbnail,
                trimScript: transcriptRes.data.trimScript
              }];
            });
          }
        } catch (err) {
          if (axios.isCancel?.(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
            return; // 중단 시 즉시 종료
          }
          
          // 서버에서 반환한 에러 메시지가 있는 경우
          if (err.response?.data?.error) {
            console.error(`자막 검색 에러 (${video.videoId}):`, err.response.data.error);
            // 자막 서버 연결 실패 등 중요한 에러인 경우 사용자에게 알림
            if (err.response.data.error.includes('자막 서버에 연결할 수 없습니다') || 
                err.response.data.error.includes('자막 서버에서 오류가 발생했습니다')) {
              Swal.fire({
                icon: 'error',
                title: '자막 서버 오류',
                text: err.response.data.error,
                background: theme === "dark" ? '#282828' : '#fff',
                color: theme === "dark" ? '#fff' : 'black',
              });
              return; // 중요한 에러인 경우 검색 중단
            }
          } else {
            console.error(`자막 검색 에러 (${video.videoId}):`, err);
          }
          // 자막을 가져올 수 없는 경우 무시하고 계속 진행
        }
      }
      setCurrentBatchCompleted(true);
      if (!newNextPageToken) {
        setIsSearching(false);
        setCurrentSearchChannelId(null);
        setHasMoreVideos(false);
      } else {
        setIsSearching(false);
        setCurrentSearchChannelId(null);
      }
    } catch (err) {
      if (axios.isCancel?.(err) || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return; // 중단 시 즉시 종료
      }
      console.error('영상 검색 중 오류가 발생했습니다:', err);
      Swal.fire({
        icon: 'error',
        title: '검색 오류',
        text: '영상 검색 중 오류가 발생했습니다.',
        background: theme === "dark" ? '#282828' : '#fff',
        color: theme === "dark" ? '#fff' : 'black',
      });
      setIsSearching(false);
      setCurrentSearchChannelId(null);
    }
  };

  // 채널명 검색 결과에서 채널을 선택하면 channelInfo로 설정
  const handleSelectChannel = (ch) => {
    setChannelInfo(ch);
    setSearchedChannel([]);
    setSearchMode('url'); // 선택 시 url 모드로 전환(정보만 보여줌)
  };

  // 채널 선택을 리셋하는 함수
  const handleResetChannel = async () => {
    if (isSearching) {
      const result = await Swal.fire({
        icon: 'warning',
        title: '검색을 중단하시겠습니까?',
        html: '진행 중인 영상 검색이 중단됩니다.',
        showCancelButton: true,
        confirmButtonText: '네',
        cancelButtonText: '아니오',
        background: theme === "dark" ? '#282828' : '#fff',
        color: theme === "dark" ? '#fff' : 'black',
      });
      if (!result.isConfirmed) return;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    } else if (searchedVideos.length > 0) {
      const result = await Swal.fire({
        icon: 'warning',
        title: '채널을 변경하시겠습니까?',
        html: '검색 결과가 초기화됩니다.',
        showCancelButton: true,
        confirmButtonText: '네',
        cancelButtonText: '아니오',
        background: theme === "dark" ? '#282828' : '#fff',
        color: theme === "dark" ? '#fff' : 'black',
      });
      if (!result.isConfirmed) return;
    }
    resetAllStates();
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const isInitial = !channelInfo && searchedVideos.length === 0 && !isSearching;

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
      <div className="global-footer">
        © 2025 YouTube Cue Finder
      </div>
    </>
  );
}

export default App;
