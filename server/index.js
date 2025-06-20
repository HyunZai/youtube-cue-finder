require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const PORT = process.env.PORT || 3001;
const axios = require('axios');

app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello from Node.js server!');
});

// 채널 URL로 유튜브 채널 정보 조회
app.get('/api/channel-info', async (req, res) => {
  console.log("test!!!!!!!!!!!!!!!!!!");
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: '채널 URL을 입력하세요.' });
  }
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API 키가 서버에 설정되어 있지 않습니다.' });
  }
  // 채널ID 또는 핸들 추출
  let channelId = null;
  let handle = null;
  try {
    const channelIdMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    const handleMatch = url.match(/youtube\.com\/(?:@|user\/)([^/?]+)/u);
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
      const apiUrl = 'https://www.googleapis.com/youtube/v3/channels';
      const apiRes = await axios.get(apiUrl, {
        params: {
          part: 'snippet',
          id: channelId,
          key: apiKey,
        },
      });
      const item = apiRes.data.items && apiRes.data.items[0];
      if (item) {
        channelInfo = {
          name: item.snippet.title,
          url: `https://youtube.com/channel/${item.id}`,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails && item.snippet.thumbnails.default && item.snippet.thumbnails.default.url,
        };
      }
    } else if (handle) {
      // 핸들(@)로 조회: search API로 채널 찾기 (정확 매칭)
      const apiUrl = 'https://www.googleapis.com/youtube/v3/search';
      const apiRes = await axios.get(apiUrl, {
        params: {
          part: 'snippet',
          q: handle,
          type: 'channel',
          maxResults: 10,
          key: apiKey,
        },
      });
      const items = apiRes.data.items || [];
      // 여러 채널ID를 모아서 channels API로 상세 조회
      const channelIds = items.map(item => item.snippet.channelId).filter(Boolean);
      if (channelIds.length > 0) {
        const channelsRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
          params: {
            part: 'snippet,brandingSettings',
            id: channelIds.join(','),
            key: apiKey,
          },
        });
        const channels = channelsRes.data.items || [];
        // customUrl(핸들)과 정확히 일치하는 채널 찾기
        const matched = channels.find(ch => {
          // brandingSettings.customUrl은 @ 없이 저장됨
          const customUrl = ch.brandingSettings && ch.brandingSettings.channel && ch.brandingSettings.channel.customUrl;
          // 입력 handle에서 @ 제거 후 비교
          return customUrl && (customUrl.replace(/^@/, '') === handle.replace(/^@/, ''));
        });
        if (matched) {
          channelInfo = {
            name: matched.snippet.title,
            url: `https://youtube.com/channel/${matched.id}`,
            description: matched.snippet.description,
            thumbnail: matched.snippet.thumbnails && matched.snippet.thumbnails.default && matched.snippet.thumbnails.default.url,
          };
        }
      }
    }
    if (!channelInfo) {
      return res.status(404).json({ error: '채널 정보를 찾을 수 없습니다.' });
    }
    res.json({ channelInfo });
  } catch (err) {
    res.status(500).json({ error: '유튜브 채널 정보 조회 중 오류가 발생했습니다.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});