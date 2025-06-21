from flask import Flask, jsonify
from youtube_transcript_api import YouTubeTranscriptApi
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 모든 오리진에 대해 CORS 허용

@app.route('/transcript/<video_id>', methods=['GET'])
def get_transcript(video_id):
    try:
        # 한국어 또는 영어 자막을 우선으로 가져오기
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['ko', 'en'])
        
        # 전체 자막 텍스트를 하나의 문자열로 합치기
        full_transcript = " ".join([item['text'] for item in transcript_list])
        
        return jsonify({
            "video_id": video_id,
            "transcript": full_transcript
        })
    except Exception as e:
        # 자막을 가져올 수 없는 경우 (자막이 없거나, 비공개 영상 등)
        return jsonify({"error": str(e)}), 404

if __name__ == '__main__':
    # Node.js 서버와 충돌하지 않도록 5001번 포트 사용
    app.run(port=5001, debug=True) 