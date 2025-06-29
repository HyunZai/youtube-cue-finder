import { useContext } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { AppContext } from '../context/AppContext';

export const useCueWordSearch = () => {
  const {
    theme,
    channelInfo,
    cueWord, setCueWord,
    searchedVideos, setSearchedVideos,
    isSearching, setIsSearching,
    nextPageToken, setNextPageToken,
    hasMoreVideos, setHasMoreVideos,
    currentBatchCompleted, setCurrentBatchCompleted,
    currentSearchChannelId, setCurrentSearchChannelId,
    abortControllerRef,
  } = useContext(AppContext);

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

  return {
    cueWord,
    setCueWord,
    searchedVideos,
    isSearching,
    currentBatchCompleted,
    hasMoreVideos,
    handleCueSearch,
  };
}; 