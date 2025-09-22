// YouTube 실시간 캡처 및 기상 데이터 오버레이 서비스
import { getCurrentWeather, JEJU_WEATHER_STATIONS } from './weatherService';
import type { CurrentWeatherData } from './weatherService';

export interface CaptureResult {
  imageUrl: string;
  weatherData: CurrentWeatherData | null;
  timestamp: string;
  sourceTitle: string;
}

// YouTube URL에서 비디오 ID 추출
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Canvas에 기상 데이터를 크고 잘 보이게 오버레이
function drawWeatherOverlay(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  weatherData: CurrentWeatherData | null,
  sourceTitle: string
) {
  const width = canvas.width;
  const height = canvas.height;

  // 더 큰 반투명 배경 (우측 상단으로 이동하고 크기 증가)
  const overlayWidth = 400;
  const overlayHeight = weatherData ? 280 : 150;
  const overlayX = width - overlayWidth - 30;
  const overlayY = 30;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);

  // 테두리 추가
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(overlayX, overlayY, overlayWidth, overlayHeight);

  // 제목 (더 크게)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(sourceTitle, overlayX + 20, overlayY + 35);

  // 시간 (더 크게)
  const now = new Date();
  const timeStr = now.toLocaleString('ko-KR');
  ctx.font = '18px Arial, sans-serif';
  ctx.fillStyle = '#cccccc';
  ctx.fillText(`캡처 시간: ${timeStr}`, overlayX + 20, overlayY + 65);

  if (weatherData) {
    // 온도 (훨씬 크게, 눈에 띄는 색상)
    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.fillStyle = '#ff4757';
    ctx.fillText(`${weatherData.temperature}°C`, overlayX + 20, overlayY + 135);

    // 날씨 상태 (크게)
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#5dade2';
    ctx.fillText(weatherData.weather, overlayX + 250, overlayY + 135);

    // 기타 데이터 (더 크게)
    ctx.font = '20px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    let y = overlayY + 165;

    ctx.fillText(`💧 습도: ${weatherData.humidity}%`, overlayX + 20, y);
    y += 30;
    ctx.fillText(`💨 풍속: ${weatherData.windSpeed}m/s ${weatherData.windDirection}`, overlayX + 20, y);
    y += 30;
    if (weatherData.precipitation > 0) {
      ctx.fillText(`🌧️ 강수량: ${weatherData.precipitation}mm`, overlayX + 20, y);
    } else {
      ctx.fillText(`📊 현재 관측 데이터`, overlayX + 20, y);
    }

    // 관측소 정보 (더 크게)
    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText(`📍 ${weatherData.location} 관측소 | ${weatherData.observationTime}`, overlayX + 20, overlayY + 265);
  } else {
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = '#f39c12';
    ctx.fillText('⚠️ 기상 데이터를 가져올 수 없습니다', overlayX + 20, overlayY + 110);
  }
}

// YouTube 썸네일을 사용한 임시 캡처 (실제 구현 전 테스트용)
async function captureYouTubeThumbnail(youtubeUrl: string, sourceTitle: string): Promise<CaptureResult | null> {
  try {
    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      console.error('유효하지 않은 YouTube URL:', youtubeUrl);
      return null;
    }

    // YouTube 썸네일 URL (여러 품질 시도)
    const thumbnailUrls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, // 고화질
      `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,    // 중화질
      `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,    // 보통화질
      `https://img.youtube.com/vi/${videoId}/default.jpg`       // 기본화질
    ];

    // 기상 데이터 가져오기 (제주를 기본으로, 나중에 지역 매핑 추가)
    const weatherData = await getCurrentWeather('제주');

    // Canvas에 이미지와 오버레이 합성
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 여러 썸네일 URL을 순차적으로 시도
    return new Promise((resolve) => {
      let currentIndex = 0;

      const tryNextThumbnail = () => {
        if (currentIndex >= thumbnailUrls.length) {
          console.error('모든 썸네일 URL 실패:', thumbnailUrls);
          resolve(null);
          return;
        }

        const thumbnailUrl = thumbnailUrls[currentIndex];
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          console.log(`썸네일 로드 성공: ${thumbnailUrl}`);

          // Canvas 크기 설정
          canvas.width = 1280;
          canvas.height = 720;

          // 이미지 그리기 (비율 유지하며 크기 조정)
          const aspectRatio = img.width / img.height;
          let drawWidth = canvas.width;
          let drawHeight = canvas.height;

          if (aspectRatio > canvas.width / canvas.height) {
            drawHeight = canvas.width / aspectRatio;
          } else {
            drawWidth = canvas.height * aspectRatio;
          }

          const x = (canvas.width - drawWidth) / 2;
          const y = (canvas.height - drawHeight) / 2;

          ctx.drawImage(img, x, y, drawWidth, drawHeight);

          // Canvas 오버레이 제거 - 하단 텍스트만 사용

          // Canvas를 Base64로 변환
          const imageUrl = canvas.toDataURL('image/jpeg', 0.9);

          resolve({
            imageUrl,
            weatherData,
            timestamp: new Date().toISOString(),
            sourceTitle
          });
        };

        img.onerror = () => {
          console.warn(`썸네일 로드 실패: ${thumbnailUrl}, 다음 시도...`);
          currentIndex++;
          tryNextThumbnail();
        };

        img.src = thumbnailUrl;
      };

      tryNextThumbnail();
    });

  } catch (error) {
    console.error('YouTube 캡처 실패:', error);
    return null;
  }
}

// FFmpeg를 사용한 실제 스트림 캡처 (서버 사이드 필요)
async function captureYouTubeStream(youtubeUrl: string, sourceTitle: string): Promise<CaptureResult | null> {
  // TODO: 실제 구현 시 서버 API 호출
  // const response = await fetch('/api/capture-stream', {
  //   method: 'POST',
  //   body: JSON.stringify({ youtubeUrl, sourceTitle })
  // });

  console.log('실제 스트림 캡처는 서버 구현이 필요합니다. 현재는 썸네일을 사용합니다.');
  return captureYouTubeThumbnail(youtubeUrl, sourceTitle);
}

// 지역명을 기상청 관측소로 매핑
function getWeatherStationFromTitle(sourceTitle: string): keyof typeof JEJU_WEATHER_STATIONS {
  if (sourceTitle.includes('서귀포') || sourceTitle.includes('중문')) return '서귀포';
  if (sourceTitle.includes('성산') || sourceTitle.includes('우도')) return '성산포';
  if (sourceTitle.includes('고산') || sourceTitle.includes('애월')) return '고산';
  return '제주'; // 기본값
}

// 메인 캡처 함수
export async function captureWeatherScene(youtubeUrl: string, sourceTitle: string): Promise<CaptureResult | null> {
  console.log(`날씨 장면 캡처 시작: ${sourceTitle}`);

  try {
    // 지역에 맞는 기상 데이터 가져오기
    const station = getWeatherStationFromTitle(sourceTitle);
    const weatherData = await getCurrentWeather(station);

    console.log(`${station} 관측소 데이터:`, weatherData);

    // YouTube 캡처 (현재는 썸네일 사용, 추후 실시간 스트림 캡처로 변경)
    const result = await captureYouTubeThumbnail(youtubeUrl, sourceTitle);

    if (result) {
      result.weatherData = weatherData; // 최신 기상 데이터로 업데이트
      console.log('캡처 완료:', result.timestamp);
    }

    return result;
  } catch (error) {
    console.error('날씨 장면 캡처 실패:', error);
    return null;
  }
}

// 테스트용 함수
export async function testCapture() {
  const testUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // 테스트용 URL
  const result = await captureWeatherScene(testUrl, '제주시 테스트 캠');

  if (result) {
    console.log('✅ 캡처 테스트 성공');
    console.log('이미지 크기:', result.imageUrl.length, 'bytes');
    console.log('기상 데이터:', result.weatherData);
    return result;
  } else {
    console.log('❌ 캡처 테스트 실패');
    return null;
  }
}