import React, { createContext, useState, useRef } from 'react';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  // Channel related states
  const [channelInput, setChannelInput] = useState('');
  const [channelInfo, setChannelInfo] = useState(null); // For channel info if found by URL
  const [searchMode, setSearchMode] = useState(''); // 'url' or 'name'
  const [searchedChannel, setSearchedChannel] = useState([]); // for name search results
  const [currentSearchChannelId, setCurrentSearchChannelId] = useState(null); // 현재 검색 중인 채널 ID

  // Cue word search related states
  const [cueWord, setCueWord] = useState(''); // 검색 키워드
  const [searchedVideos, setSearchedVideos] = useState([]); // 검색결과 리스트
  const [isSearching, setIsSearching] = useState(false); // 검색 중인지 여부

  // Pagination related states
  const [nextPageToken, setNextPageToken] = useState(null); // 다음 페이지 토큰
  const [hasMoreVideos, setHasMoreVideos] = useState(true); // 더 검색할 영상이 있는지 여부
  const [currentBatchCompleted, setCurrentBatchCompleted] = useState(false); // 현재 50개 영상 검색 완료 여부

  // Abort controller for search cancellation
  const abortControllerRef = useRef(null); // 검색 중단용 AbortController

  // Helper functions for Korean URL handling
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

  const extractKoreanFromHandle = (input) => {
    const handleMatch = input.match(/youtube\.com\/(?:@|user\/)([^/?]+)/u);
    if (handleMatch) {
      const handle = handleMatch[1];
      const decodedHandle = decodeURIComponent(handle);
      // 한글 부분만 추출 (연속된 한글 문자들)
      const koreanMatch = decodedHandle.match(/[가-힣]+/g);
      if (koreanMatch && koreanMatch.length > 0) {
        return koreanMatch.join(' '); // 여러 한글 단어가 있으면 공백으로 연결
      }
    }
    return null;
  };

  // Reset all states function
  const resetAllStates = () => {
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
    setSearchedChannel([]);
  };

  return (
    <AppContext.Provider value={{
      // User and theme
      user, setUser, theme, setTheme,
      
      // Channel states
      channelInput, setChannelInput,
      channelInfo, setChannelInfo,
      searchMode, setSearchMode,
      searchedChannel, setSearchedChannel,
      currentSearchChannelId, setCurrentSearchChannelId,
      
      // Cue word search states
      cueWord, setCueWord,
      searchedVideos, setSearchedVideos,
      isSearching, setIsSearching,
      
      // Pagination states
      nextPageToken, setNextPageToken,
      hasMoreVideos, setHasMoreVideos,
      currentBatchCompleted, setCurrentBatchCompleted,
      
      // Abort controller
      abortControllerRef,
      
      // Helper functions
      hasKoreanInHandle,
      extractKoreanFromHandle,
      resetAllStates,
    }}>
      {children}
    </AppContext.Provider>
  );
}