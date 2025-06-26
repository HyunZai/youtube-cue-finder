import { useState, useEffect, useRef } from 'react'
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
import { useContext } from 'react'
import { AppContext } from './context/AppContext'

function App() {
  const { theme, setTheme } = useContext(AppContext)
  // State for channel input and type
  const [channelInput, setChannelInput] = useState('')
  const [channelInfo, setChannelInfo] = useState(null) // For channel info if found by URL
  const [searchMode, setSearchMode] = useState('') // 'url' or 'name'
  const [channelSearchResults, setChannelSearchResults] = useState([]) // for name search results
  const [currentSearchChannelId, setCurrentSearchChannelId] = useState(null); // 현재 검색 중인 채널 ID
  
  const [cueWord, setCueWord] = useState('') //검색 키워드
  const [searchedVideos, setSearchedVideos] = useState([]) // 검색결과 리스트
  const [isSearching, setIsSearching] = useState(false) // 검색 중인지 여부
  
  const [nextPageToken, setNextPageToken] = useState(null); // 다음 페이지 토큰
  const [hasMoreVideos, setHasMoreVideos] = useState(true); // 더 검색할 영상이 있는지 여부
  const [currentBatchCompleted, setCurrentBatchCompleted] = useState(false); // 현재 50개 영상 검색 완료 여부
  const abortControllerRef = useRef(null); // 검색 중단용 AbortController
  //const isSearchingRef = useRef(false);

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
  }, [isSearching]); // 의존성 배열을 빈 배열로 변경

  // 테마 변경 시 body class도 변경
  useEffect(() => {
    document.body.classList.remove('dark', 'light');
    document.body.classList.add(theme);
  }, [theme]);

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
        setChannelSearchResults([]);
      } else if (res.data.results) {
        setChannelSearchResults(res.data.results);
        setSearchMode('name');
        setChannelInfo(null);
      }
    } catch {
      setChannelInfo(null);
      setChannelSearchResults([]);
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
          if (!isContinueSearch && currentSearchChannelId !== channelInfo.id) {
            return;
          }
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
    setChannelSearchResults([]);
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
    setChannelInfo(null);
    setChannelInput('');
    setSearchMode('');
    setSearchedVideos([]);
    setIsSearching(false);
    setCueWord('');
    setCurrentSearchChannelId(null);
    setNextPageToken(null);
    setHasMoreVideos(true);
    setCurrentBatchCompleted(false);
  };

  const handleToggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <nav className="global-navbar">
        <span className="global-navbar-title">YouTube Cue Finder</span>
        <button
          className="darkmode-toggle-btn"
          onClick={handleToggleTheme}
          aria-label="다크모드 토글"
        >
          {theme === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
        </button>
      </nav>
      <div className="app-container">
        <h1 className="app-title">유튜브 영상 찾기</h1>
        {/* 1단계: 채널 선택 */}
        {!channelInfo ? (
          <ChannelSearch
            channelInput={channelInput}
            setChannelInput={setChannelInput}
            handleChannelSearch={handleChannelSearch}
            searchMode={searchMode}
            channelSearchResults={channelSearchResults}
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
    </>
  );
}

export default App;
