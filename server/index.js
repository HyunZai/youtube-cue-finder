require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3001;
const axios = require('axios');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from Node.js server!');
});

// API 키 상태 확인
app.get('/api/health', async (req, res) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ 
      status: 'error', 
      message: 'YouTube API 키가 설정되어 있지 않습니다.',
      apiKeyExists: false 
    });
  }
  
  try {
    // 간단한 API 호출로 키 유효성 테스트
    const testRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: 'test',
        maxResults: 1,
        key: apiKey,
      },
    });
    
    res.json({ 
      status: 'healthy', 
      message: 'YouTube API 키가 정상적으로 작동합니다.',
      apiKeyExists: true,
      quotaRemaining: testRes.headers['x-quota-remaining'] || 'unknown'
    });
  } catch (error) {
    console.error('API 키 테스트 에러:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 403) {
      res.status(500).json({ 
        status: 'error', 
        message: 'YouTube API 키가 유효하지 않거나 할당량이 초과되었습니다.',
        apiKeyExists: true,
        error: error.response?.data?.error?.message || 'Forbidden'
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        message: 'YouTube API 연결에 문제가 있습니다.',
        apiKeyExists: true,
        error: error.message
      });
    }
  }
});

// 채널 정보를 일관된 형태로 매핑하는 헬퍼 함수
const mapChannelInfo = (item, channelId = null) => ({
  id: channelId || item.snippet.channelId,
  name: item.snippet.title,
  url: `https://youtube.com/channel/${channelId || item.snippet.channelId}`,
  description: item.snippet.description,
  thumbnail: item.snippet.thumbnails && item.snippet.thumbnails.default && item.snippet.thumbnails.default.url,
});

// 채널ID로 채널 정보 조회
const getChannelById = async (channelId, apiKey) => {
  const apiUrl = 'https://www.googleapis.com/youtube/v3/channels';
  const apiRes = await axios.get(apiUrl, {
    params: {
      part: 'snippet',
      id: channelId,
      key: apiKey,
    },
  });
  const item = apiRes.data.items && apiRes.data.items[0];
  return item ? mapChannelInfo(item, channelId) : null;
};

// 검색으로 채널 정보 조회
const searchChannels = async (query, apiKey, maxResults = 1) => {
  try {
    const apiUrl = 'https://www.googleapis.com/youtube/v3/search';
    const apiRes = await axios.get(apiUrl, {
      params: {
        part: 'snippet',
        q: query,
        type: 'channel',
        maxResults,
        key: apiKey,
      },
    });
    return apiRes.data.items || [];
  } catch (error) {
    console.error('YouTube API 검색 에러:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      query: query
    });
    
    if (error.response?.status === 403) {
      throw new Error('YouTube API 키가 유효하지 않거나 할당량이 초과되었습니다. API 키를 확인해주세요.');
    } else if (error.response?.status === 400) {
      throw new Error('잘못된 검색 요청입니다. 검색어를 확인해주세요.');
    } else {
      throw new Error(`YouTube API 오류: ${error.response?.status || '알 수 없는 오류'}`);
    }
  }
};

// 채널의 모든 영상 목록 가져오기
const getChannelVideos = async (channelId, pageToken = null) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API 키가 설정되어 있지 않습니다.');
  }

  // 1. 채널의 업로드 재생목록 ID 가져오기
  const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: {
      part: 'contentDetails',
      id: channelId,
      key: apiKey,
    },
  });

  const uploadsPlaylistId = channelRes.data.items[0].contentDetails.relatedPlaylists.uploads;

  // 2. 업로드 재생목록에서 영상 목록 가져오기
  const playlistRes = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
    params: {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 50, // 최대 50개 영상
      pageToken: pageToken, // 페이지네이션 토큰
      key: apiKey,
    },
  });

  return {
    videos: playlistRes.data.items.map(item => ({
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    })),
    nextPageToken: playlistRes.data.nextPageToken, // 다음 페이지 토큰
  };
};

// 통합 채널 검색 (URL 또는 채널명)
app.get('/api/channel-search', async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).json({ error: '검색어를 입력하세요.' });
  }
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API 키가 서버에 설정되어 있지 않습니다.' });
  }
  
  try {
    // URL인지 확인
    const isYoutubeUrl = query.includes('youtube.com') || query.includes('youtu.be');
    
    if (isYoutubeUrl) {
      // URL인 경우: 채널 정보 추출
      let channelId = null;
      let handle = null;
      
      const channelIdMatch = query.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
      const handleMatch = query.match(/youtube\.com\/(?:@|user\/)([^/?]+)/u);
      
      if (channelIdMatch) {
        channelId = channelIdMatch[1];
      } else if (handleMatch) {
        handle = handleMatch[1];
      } else {
        return res.status(400).json({ error: '유효한 유튜브 채널 URL이 아닙니다.' });
      }
      
      let channelInfo = null;
      if (channelId) {
        // 채널ID로 조회
        channelInfo = await getChannelById(channelId, apiKey);
      } else if (handle) {
        // 핸들(@)로 조회: search API로 채널 찾기
        const items = await searchChannels(handle, apiKey, 1);
        channelInfo = items.length > 0 ? mapChannelInfo(items[0]) : null;
      }
      
      if (!channelInfo) {
        return res.status(404).json({ error: '채널 정보를 찾을 수 없습니다.' });
      }
      
      res.json({ channelInfo });
    } else {
      // 텍스트인 경우: 채널명으로 검색
      const items = await searchChannels(query, apiKey, 5);
      const results = items.map(item => mapChannelInfo(item));
      
      res.json({ results });
    }
  } catch (err) {
    console.error('채널 검색 에러:', err);
    
    if (err.message.includes('YouTube API 키')) {
      res.status(500).json({ error: err.message });
    } else if (err.response?.status === 403) {
      res.status(500).json({ error: 'YouTube API 키가 유효하지 않거나 할당량이 초과되었습니다.' });
    } else {
      res.status(500).json({ error: '채널 검색 중 오류가 발생했습니다.' });
    }
  }
});

// 채널의 영상 목록 가져오기
app.get('/api/channel-videos', async (req, res) => {
  const { channelId, pageToken } = req.query;
  
  if (!channelId) {
    return res.status(400).json({ error: 'channelId is required' });
  }

  try {
    const result = await getChannelVideos(channelId, pageToken);
    res.json({ 
      videos: result.videos,
      nextPageToken: result.nextPageToken 
    });
  } catch (error) {
    console.error('Error getting channel videos:', error);
    res.status(500).json({ error: 'Failed to get channel videos' });
  }
});

// 개별 영상의 자막에서 검색어 확인
app.get('/api/check-transcript', async (req, res) => {
  const { videoId, query, order } = req.query;
  
  if (!videoId || !query) {
    return res.status(400).json({ error: 'videoId and query are required' });
  }

  try {
    const transcriptRes = await axios.get(`http://localhost:5001/transcript/${videoId}?order=${order || 'unknown'}`);
    const transcriptText = transcriptRes.data.transcript.replaceAll(" ", "") || '';
    const matched = transcriptText.toLowerCase().includes(query.replaceAll(" ", "").toLowerCase());
    const matchedTranscript = matched && transcriptRes.data.transcript;

    let trimScript = null;
    if (matched && matchedTranscript) {
      const cleanedQuery = query.replaceAll(" ", "").toLowerCase();
      const sentenceRegex = /[^.?!]*[.?!]/g;
      const sentences = matchedTranscript.match(sentenceRegex) || [];

      for (let sentence of sentences) {
        const cleanedSentence = sentence.replaceAll(" ", "").toLowerCase();
        if (cleanedSentence.includes(cleanedQuery)) {
          trimScript = sentence.trim();
          break;
        }
      }
    }

    // result가 너무 길면 query 기준으로 앞뒤 자르기
    if (trimScript && trimScript.length > 50) {
      const lowerResult = trimScript.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const index = lowerResult.indexOf(lowerQuery);

      if (index !== -1) {
        const start = Math.max(0, index - 20);
        const end = Math.min(trimScript.length, index + lowerQuery.length + 20);
        let snippet = trimScript.substring(start, end).trim();

        // 앞뒤 생략 표시 추가
        if (start > 0) snippet = '...' + snippet;
        if (end < trimScript.length) snippet = snippet + '...';

        trimScript = snippet;
      }
    }

    if (trimScript) {
      const cleanedScript = trimScript.replaceAll(" ", "").toLowerCase();
      const cleanedQuery = query.replaceAll(" ", "").toLowerCase();
      const index = cleanedScript.indexOf(cleanedQuery);
    
      if (index !== -1) {
        // 원래 trimScript에서 index에 해당하는 부분을 찾아 강조
        // 매칭된 부분의 원본 문자열 범위를 계산
        let count = 0;
        let start = -1, end = -1;
        for (let i = 0; i < trimScript.length; i++) {
          if (trimScript[i] !== ' ') {
            if (count === index) start = i;
            if (count === index + cleanedQuery.length - 1) {
              end = i + 1; // end는 exclusive
              break;
            }
            count++;
          }
        }
    
        if (start !== -1 && end !== -1) {
          const before = trimScript.slice(0, start);
          const match = trimScript.slice(start, end);
          const after = trimScript.slice(end);
          trimScript = `${before}<b style="color:#ff2121;">${match}</b>${after}`;
        }
      }
    }

    res.json({ matched, trimScript });
  } catch (error) {
    console.error('자막 검색 에러:', error);
    
    // 에러 타입에 따라 다른 응답
    if (error.response?.status === 404) {
      // 자막이 없는 경우
      res.json({ matched: false, error: '자막을 찾을 수 없습니다.' });
    } else if (error.code === 'ECONNREFUSED') {
      // Python API 서버가 실행되지 않은 경우
      res.status(500).json({ error: '자막 서버에 연결할 수 없습니다.' });
    } else if (error.response?.status >= 500) {
      // 서버 에러
      res.status(500).json({ error: '자막 서버에서 오류가 발생했습니다.' });
    } else {
      // 기타 에러
      res.status(500).json({ error: '자막 검색 중 오류가 발생했습니다.' });
    }
  }
});

app.post('/api/search-videos', express.json(), async (req, res) => {
  const { channelId, query } = req.body;

  if (!channelId || !query) {
    return res.status(400).json({ error: 'channelId and query are required' });
  }

  try {
    const allVideos = await getChannelVideos(channelId);
    const matchedVideos = [];

    for (const video of allVideos.videos) {
      const videoId = video.videoId;
      try {
        const transcriptRes = await axios.get(`http://localhost:5001/transcript/${videoId}`);
        const transcript = transcriptRes.data.transcript || '';

        if (transcript.toLowerCase().includes(query.toLowerCase())) {
          matchedVideos.push({
            videoId: video.videoId,
            title: video.title,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            thumbnail: video.thumbnail,
            publishedAt: video.publishedAt,
            snippet: transcript.substring(0, 100) + '...', // 자막 일부 표시
          });
        }
      } catch (transcriptError) {
        // 자막이 없는 영상은 무시
        console.log(`자막을 가져올 수 없습니다: ${videoId}`);
      }
    }
    // 최신순으로 정렬
    matchedVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    res.json({ videos: matchedVideos });
  } catch (error) {
    console.error('Error searching videos:', error);
    res.status(500).json({ error: 'Failed to search videos' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});