import { useState } from 'react'
import './App.css'
import axios from 'axios'

function App() {
  // State for channel input and type
  const [channelInput, setChannelInput] = useState('')
  const [channelInfo, setChannelInfo] = useState(null) // For channel info if found by URL
  const [cueWord, setCueWord] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchMode, setSearchMode] = useState('') // 'url' or 'name'

  // Simple URL check
  const isYoutubeChannelUrl = (input) => {
    return input.startsWith('https://www.youtube.com/channel/') ||
      input.startsWith('https://youtube.com/channel/') ||
      input.startsWith('https://www.youtube.com/@') ||
      input.startsWith('https://youtube.com/@')
  }

  // Handle channel input submit
  const handleChannelSearch = async (e) => {
    e.preventDefault()
    if (isYoutubeChannelUrl(channelInput)) {
      setSearchMode('url')
      try {
        const res = await axios.get('/api/channel-info', { params: { url: channelInput } })
        setChannelInfo(res.data.channelInfo || null)
      } catch {
        setChannelInfo(null)
        alert('채널 정보를 불러오는 중 오류가 발생했습니다.')
      }
      setSearchResults([])
    } else {
      setSearchMode('name')
      setChannelInfo(null)
      // TODO: 서버에 채널명 검색 요청 (아직 미구현)
    }
  }

  // Handle cue word search (dummy)
  const handleCueSearch = (e) => {
    e.preventDefault()
    // TODO: 실제로는 서버에 cueWord로 검색 요청
    // 임시로 더미 데이터
    setSearchResults([
      { title: '예시 영상 1', url: '#', snippet: '이 영상에서 단서 단어가 나옴' },
      { title: '예시 영상 2', url: '#', snippet: '여기서도 단서 단어가 등장' },
    ])
  }

  return (
    <div className="app-container" style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <h1 style={{ textAlign: 'center' }}>YouTube Cue</h1>
      <form onSubmit={handleChannelSearch} style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500 }}>
          유튜브 채널명 또는 채널 URL 입력
          <input
            type="text"
            value={channelInput}
            onChange={e => setChannelInput(e.target.value)}
            placeholder="채널명 또는 https://youtube.com/@..."
            style={{ width: '100%', marginTop: 8, padding: 8, fontSize: 16 }}
            required
          />
        </label>
        <button type="submit" style={{ marginTop: 12, width: '100%', padding: 10, fontSize: 16 }}>
          채널 검색
        </button>
      </form>

      {/* 채널 URL로 찾았을 때 채널 정보 표시 */}
      {searchMode === 'url' && channelInfo && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, background: '#f7f7f7', borderRadius: 8, padding: 12 }}>
          <img src={channelInfo.thumbnail} alt="채널 썸네일" style={{ width: 60, height: 60, borderRadius: '50%', marginRight: 16 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 18 }}>{channelInfo.name}</div>
            <div style={{ color: '#666', fontSize: 14 }}>{channelInfo.description}</div>
            <a href={channelInfo.url} target="_blank" rel="noopener noreferrer" style={{ color: '#1976d2', fontSize: 14 }}>
              채널 바로가기
            </a>
          </div>
        </div>
      )}

      {/* cue word 검색창 */}
      <form onSubmit={handleCueSearch} style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 500 }}>
          단서(대사, 말)로 영상 검색
          <input
            type="text"
            value={cueWord}
            onChange={e => setCueWord(e.target.value)}
            placeholder="예: 오늘도 화이팅"
            style={{ width: '100%', marginTop: 8, padding: 8, fontSize: 16 }}
            required
          />
        </label>
        <button type="submit" style={{ marginTop: 12, width: '100%', padding: 10, fontSize: 16 }}>
          단서로 검색
        </button>
      </form>

      {/* 검색 결과 */}
      {searchResults.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>검색 결과</h3>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {searchResults.map((result, idx) => (
              <li key={idx} style={{ marginBottom: 16, background: '#f0f0f0', borderRadius: 8, padding: 12 }}>
                <a href={result.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600, fontSize: 16 }}>
                  {result.title}
                </a>
                <div style={{ color: '#555', fontSize: 14 }}>{result.snippet}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default App
