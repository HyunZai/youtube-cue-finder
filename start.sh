#!/bin/bash

# YouTube Cue Finder 선택적 서비스 시작 스크립트
# 사용법: ./start.sh [react] [node] [python] [all]

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 변수 초기화
START_REACT=false
START_NODE=false
START_PYTHON=false
PYTHON_PID=""
NODE_PID=""
CLIENT_PID=""

# 함수: 사용법 출력
show_usage() {
    echo -e "${BLUE}YouTube Cue Finder 서비스 시작 스크립트${NC}"
    echo ""
    echo "사용법:"
    echo "  ./start.sh [react] [node] [python] [all]"
    echo ""
    echo "옵션:"
    echo "  react   - React 클라이언트 시작"
    echo "  node    - Node.js 서버 시작"
    echo "  python  - Python API 서버 시작"
    echo "  all     - 모든 서비스 시작"
    echo ""
    echo "예시:"
    echo "  ./start.sh react          # React 클라이언트만 시작"
    echo "  ./start.sh node python    # Node.js 서버와 Python API만 시작"
    echo "  ./start.sh all            # 모든 서비스 시작"
    echo ""
}

# 함수: 프로세스 종료
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 서비스 종료 중...${NC}"
    
    if [ ! -z "$PYTHON_PID" ]; then
        echo -e "${BLUE}📡 Python API 종료 (PID: $PYTHON_PID)${NC}"
        kill $PYTHON_PID 2>/dev/null
    fi
    
    if [ ! -z "$NODE_PID" ]; then
        echo -e "${BLUE}🖥️  Node.js 서버 종료 (PID: $NODE_PID)${NC}"
        kill $NODE_PID 2>/dev/null
    fi
    
    if [ ! -z "$CLIENT_PID" ]; then
        echo -e "${BLUE}🌐 React 클라이언트 종료 (PID: $CLIENT_PID)${NC}"
        kill $CLIENT_PID 2>/dev/null
    fi
    
    echo -e "${GREEN}✅ 모든 서비스가 종료되었습니다.${NC}"
    exit 0
}

# Ctrl+C 시그널 처리
trap cleanup SIGINT

# 인자 처리
if [ $# -eq 0 ]; then
    show_usage
    exit 1
fi

# 인자 파싱
for arg in "$@"; do
    case $arg in
        "react")
            START_REACT=true
            ;;
        "node")
            START_NODE=true
            ;;
        "python")
            START_PYTHON=true
            ;;
        "all")
            START_REACT=true
            START_NODE=true
            START_PYTHON=true
            ;;
        *)
            echo -e "${RED}❌ 알 수 없는 옵션: $arg${NC}"
            show_usage
            exit 1
            ;;
    esac
done

echo -e "${GREEN}🚀 YouTube Cue Finder 서비스 시작${NC}"
echo ""

# Python API 시작
if [ "$START_PYTHON" = true ]; then
    echo -e "${BLUE}📡 Python API 시작 중...${NC}"
    cd python-api
    source venv/bin/activate
    python3 app.py &
    PYTHON_PID=$!
    cd ..
    echo -e "${GREEN}✅ Python API 시작됨 (PID: $PYTHON_PID)${NC}"
    echo ""
fi

# Node.js 서버 시작
if [ "$START_NODE" = true ]; then
    echo -e "${BLUE}🖥️  Node.js 서버 시작 중...${NC}"
    cd server
    npm start &
    NODE_PID=$!
    cd ..
    echo -e "${GREEN}✅ Node.js 서버 시작됨 (PID: $NODE_PID)${NC}"
    echo ""
fi

# React 클라이언트 시작
if [ "$START_REACT" = true ]; then
    echo -e "${BLUE}🌐 React 클라이언트 시작 중...${NC}"
    cd client
    npm run dev &
    CLIENT_PID=$!
    cd ..
    echo -e "${GREEN}✅ React 클라이언트 시작됨 (PID: $CLIENT_PID)${NC}"
    echo ""
fi

# 시작된 서비스 정보 출력
echo -e "${GREEN}🎉 서비스 시작 완료!${NC}"
echo ""
echo -e "${YELLOW}📡 서비스 정보:${NC}"
if [ "$START_PYTHON" = true ]; then
    echo -e "  📡 Python API: http://localhost:5001"
fi
if [ "$START_NODE" = true ]; then
    echo -e "  🖥️  Node.js Server: http://localhost:3000"
fi
if [ "$START_REACT" = true ]; then
    echo -e "  🌐 React Client: http://localhost:5173"
fi
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# 모든 프로세스가 실행 중인 동안 대기
wait 