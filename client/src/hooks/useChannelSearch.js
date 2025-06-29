import { useContext } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { AppContext } from '../context/AppContext';

export const useChannelSearch = () => {
  const {
    theme,
    channelInput, setChannelInput,
    channelInfo, setChannelInfo,
    searchMode, setSearchMode,
    searchedChannel, setSearchedChannel,
    hasKoreanInHandle,
    extractKoreanFromHandle,
  } = useContext(AppContext);

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
  };

  const handleSelectChannel = (ch) => {
    setChannelInfo(ch);
    setSearchedChannel([]);
    setSearchMode('url'); // 선택 시 url 모드로 전환(정보만 보여줌)
  };

  return {
    channelInput,
    setChannelInput,
    channelInfo,
    searchMode,
    searchedChannel,
    handleChannelSearch,
    handleSelectChannel,
  };
}; 