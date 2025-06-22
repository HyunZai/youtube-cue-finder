# YouTube Cue
Find YouTube videos with words (cue)

YouTube 채널에서 특정 단어나 구문이 포함된 영상을 검색할 수 있는 웹 애플리케이션입니다.

## 🚀 빠른 시작

### 선택적 서비스 시작
```bash
# 모든 서비스 시작
./start.sh all

# 개별 서비스 시작
./start.sh react          # React 클라이언트만
./start.sh node           # Node.js 서버만
./start.sh python         # Python API만

# 조합 시작
./start.sh react node     # React + Node.js
./start.sh react python   # React + Python API
./start.sh node python    # Node.js + Python API
```

## 🔧 환경 설정

### Python 환경
- Python 3.11+ 필요
- 가상환경 사용 권장: `python3 -m venv venv`
- 필요한 패키지: `pip install flask youtube-transcript-api`

### Node.js 환경
- Node.js 18+ 필요
- 서버: `npm install`
- 클라이언트: `npm install`

## 📡 API 엔드포인트

- **Python API**: http://localhost:5001
  - `GET /transcript/{video_id}`: 비디오 트랜스크립트 조회
  - `GET /health`: 헬스 체크

- **Node.js Server**: http://localhost:3000
  - `POST /api/channel-search`: 채널 검색
  - `POST /api/video-search`: 비디오 검색

- **React Client**: http://localhost:5173

## 🐛 문제 해결

### Python 명령어 인식 안됨
macOS에서 `python` 명령어가 인식되지 않는 경우:
```bash
# 현재 세션에서 해결
alias python=python3

# 영구 해결 (zsh 사용자)
echo 'alias python=python3' >> ~/.zshrc
source ~/.zshrc
```

### 가상환경 활성화 필요
Python API 실행 시 반드시 가상환경을 활성화해야 합니다:
```bash
cd python-api
source venv/bin/activate
python app.py
```