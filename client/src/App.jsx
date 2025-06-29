import { useEffect, useContext } from 'react'
import './App.css'
import Swal from 'sweetalert2'
import { AppContext } from './context/AppContext'
import { useChannelSearch, useCueWordSearch } from './hooks'
import SearchHeader from './components/SearchHeader'
import SearchContainer from './components/SearchContainer'

function App() {
  const {
    theme, setTheme,
    channelInfo,
    searchedVideos,
    isSearching,
    currentBatchCompleted,
    hasMoreVideos,
    abortControllerRef,
    resetAllStates,
  } = useContext(AppContext);

  const {
    channelInput,
    setChannelInput,
    searchMode,
    searchedChannel,
    handleChannelSearch,
    handleSelectChannel,
  } = useChannelSearch();

  const {
    cueWord,
    setCueWord,
    handleCueSearch,
  } = useCueWordSearch();

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

  return (
    <>
      <SearchHeader 
        theme={theme} 
        handleToggleTheme={handleToggleTheme} 
      />
      <SearchContainer
        channelInput={channelInput}
        setChannelInput={setChannelInput}
        channelInfo={channelInfo}
        searchMode={searchMode}
        searchedChannel={searchedChannel}
        cueWord={cueWord}
        setCueWord={setCueWord}
        searchedVideos={searchedVideos}
        isSearching={isSearching}
        currentBatchCompleted={currentBatchCompleted}
        hasMoreVideos={hasMoreVideos}
        handleChannelSearch={handleChannelSearch}
        handleSelectChannel={handleSelectChannel}
        handleResetChannel={handleResetChannel}
        handleCueSearch={handleCueSearch}
      />
    </>
  );
}

export default App;
