from flask import Flask, jsonify, request
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig
from flask_cors import CORS
import logging
from datetime import datetime
import os

# 로그 디렉토리 생성
log_dir = 'logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# 로그 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'{log_dir}/transcript_api.log', encoding='utf-8'),
        logging.StreamHandler()  # 콘솔에도 출력
    ]
)

# Flask 기본 로그 비활성화
logging.getLogger('werkzeug').setLevel(logging.ERROR)

app = Flask(__name__)
CORS(app)  # 모든 오리진에 대해 CORS 허용

@app.route('/transcript/<video_id>', methods=['GET'])
def get_transcript(video_id):
    try:
        # 순번 정보 가져오기 (기본값: unknown)
        order = request.args.get('order', 'unknown')

        # https://github.com/jdepoix/youtube-transcript-api
        # 구글측에서 프록시 차단해서 작동안함 위 git링크 들어가면 대처하는 방법을 써놨는데 돈듦..
        # 한국어 또는 영어 자막을 우선으로 가져오기
        # transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
        ytt_api = YouTubeTranscriptApi(
            proxy_config=GenericProxyConfig(
                http_url="http://username:password@ip:port",
                https_url="http://username:password@ip:port"
                #filter_ip_locations=["ko", "jp"], # 특정 국가의 IP주소의 프록시만 사용하고 싶을 때 사용
            )
        )
        fetched_transcript = ytt_api.fetch(video_id, languages=['ko', 'en'])

        # is iterable
        for snippet in fetched_transcript:
            print(snippet.text)

        
        # 전체 자막 텍스트를 하나의 문자열로 합치기
        full_transcript = " ".join([item['text'] for item in fetched_transcript])
        
        logging.info(f"✅ Transcript success: {order} - {video_id}")
        
        return jsonify({
            "video_id": video_id,
            "transcript": full_transcript
        })
    except Exception as e:
        # 자막을 가져올 수 없는 경우 (자막이 없거나, 비공개 영상 등)
        order = request.args.get('order', 'unknown')
        logging.error(f"❌ Transcript failed: {order} - {video_id} - {str(e)}")
        return jsonify({"error": str(e)}), 404

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "youtube-transcript-api"})

if __name__ == '__main__':
    logging.info("🚀 YouTube Transcript API Server run (Port: 5001)")
    # Node.js 서버와 충돌하지 않도록 5001번 포트 사용
    app.run(port=5001, debug=False)  # debug=False로 변경하여 중복 로그 방지 