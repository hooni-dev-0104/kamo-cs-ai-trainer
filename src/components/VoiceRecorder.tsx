import { useVoiceRecorder } from '../hooks/useVoiceRecorder'

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void
}

export default function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
  const { isRecording, audioBlob, error, startRecording, stopRecording, reset } = useVoiceRecorder()

  const handleStop = () => {
    stopRecording()
  }

  const handleComplete = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 text-center">응대 내용을 녹음해주세요</h3>
      
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            className="w-20 h-20 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center shadow-lg"
          >
            <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {isRecording && (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg animate-pulse mb-4">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <p className="text-lg font-medium text-red-600 mb-4">녹음 중...</p>
            <button
              onClick={handleStop}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              녹음 중지
            </button>
          </div>
        )}

        {audioBlob && !isRecording && (
          <div className="text-center w-full">
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">녹음이 완료되었습니다</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                확인
              </button>
              <button
                onClick={() => {
                  reset()
                  startRecording()
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                다시 녹음
              </button>
            </div>
          </div>
        )}

        {!isRecording && !audioBlob && (
          <p className="mt-4 text-gray-600 text-sm">
            🎤 마이크 버튼을 눌러 응대 내용을 말씀해주세요
          </p>
        )}
      </div>
    </div>
  )
}

