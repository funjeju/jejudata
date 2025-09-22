import React, { useState, useEffect, useRef } from 'react';
import type { WeatherCardData } from '../types';
import Spinner from './common/Spinner';
import Modal from './common/Modal';

interface WeatherCardProps {
  initialData: WeatherCardData;
  onComplete: () => void;
  skipAnimation?: boolean; // 애니메이션 스킵 옵션
}

const statusMessages: Record<WeatherCardData['status'], string> = {
  analyzing: '[1/3] 실시간 스트림 주소 분석 중... (yt-dlp)',
  capturing: '[2/3] 최신 영상 프레임 캡처 중... (ffmpeg)',
  overlaying: '[3/3] 기상청 데이터 수신 및 오버레이 중...',
  done: '실시간 날씨 분석 완료',
};

const WeatherCard: React.FC<WeatherCardProps> = ({ initialData, onComplete, skipAnimation = false }) => {
  const [status, setStatus] = useState<WeatherCardData['status']>(skipAnimation ? 'done' : 'analyzing');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // By storing the onComplete callback in a ref, we can avoid including it in the
  // useEffect dependency array. This prevents the effect from re-running (and thus
  // calling onComplete again) when the parent component re-renders.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    // 애니메이션을 스킵하는 경우 즉시 완료 처리
    if (skipAnimation && status === 'done') {
      return;
    }

    const nextStatusMap: Record<string, WeatherCardData['status']> = {
      analyzing: 'capturing',
      capturing: 'overlaying',
      overlaying: 'done',
    };

    // If the process is already done, do nothing.
    if (status === 'done') {
      return;
    }

    const timer = setTimeout(() => {
      const nextStatus = nextStatusMap[status];
      if (nextStatus) {
        setStatus(nextStatus);
        // If the next step is the final one, call the completion handler.
        if (nextStatus === 'done') {
          onCompleteRef.current();
        }
      }
    }, 1500); // Simulate each step taking 1.5 seconds

    return () => clearTimeout(timer);
  }, [status, skipAnimation]); // This effect now only depends on its internal state machine.


  if (status !== 'done') {
    return (
      <div className="p-4 bg-white border rounded-lg shadow-sm flex items-center space-x-3 animate-pulse">
        <Spinner />
        <div>
            <p className="font-semibold text-gray-800">{initialData.sourceTitle}</p>
            <p className="text-sm text-gray-600">{statusMessages[status]}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-3 bg-white border rounded-lg shadow-sm">
          <h4 className="font-bold text-gray-800 mb-2">{initialData.sourceTitle} 실시간 날씨</h4>
          <div className="relative rounded-lg overflow-hidden">
              <img
                  src={initialData.imageUrl}
                  alt={`${initialData.sourceTitle} live camera feed`}
                  className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setIsImageModalOpen(true)}
                  title="클릭하여 확대"
              />
              <div className="absolute bottom-0 left-0 w-full p-3 bg-black bg-opacity-50 text-white">
                  <div className="flex justify-between items-center mb-2">
                      <div className="text-sm">
                          📍 <span className="font-semibold">{initialData.weatherData?.location || '제주'}</span>
                      </div>
                      <div className="text-sm font-semibold">
                          {initialData.weatherData?.weather || '맑음'}
                      </div>
                  </div>
                  <div className="flex justify-around text-center">
                      <div>
                          <p className="text-xs opacity-80">현재 기온</p>
                          <p className="font-bold text-lg">{initialData.weatherData?.temp || '분석중...'}</p>
                      </div>
                      <div>
                          <p className="text-xs opacity-80">습도</p>
                          <p className="font-bold text-lg">{initialData.weatherData?.humidity || '분석중...'}</p>
                      </div>
                      <div>
                          <p className="text-xs opacity-80">풍속</p>
                          <p className="font-bold text-lg">{initialData.weatherData?.wind || '분석중...'}</p>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* 이미지 확대 모달 */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title={`${initialData.sourceTitle} 실시간 영상`}
      >
        <div className="max-w-6xl mx-auto">
          <img
            src={initialData.imageUrl}
            alt={`${initialData.sourceTitle} live camera feed - 확대`}
            className="w-full h-auto object-contain max-h-[80vh]"
          />
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-semibold text-gray-800 mb-3">현재 기상 정보</h5>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">현재 기온</p>
                <p className="text-2xl font-bold text-red-500">{initialData.weatherData?.temp || '정보없음'}</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">습도</p>
                <p className="text-2xl font-bold text-blue-500">{initialData.weatherData?.humidity || '정보없음'}</p>
              </div>
              <div className="p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-600 mb-1">풍속</p>
                <p className="text-2xl font-bold text-green-500">{initialData.weatherData?.wind || '정보없음'}</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default WeatherCard;
