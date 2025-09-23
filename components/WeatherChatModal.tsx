import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { WeatherSource, WeatherCardData } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import AddWeatherSourceModal from './AddWeatherSourceModal';
import WeatherSourceListModal from './WeatherSourceListModal';
import WeatherCard from './WeatherCard';
import LiveWeatherViewModal from './LiveWeatherViewModal';
import { captureWeatherScene, analyzeThumbnailsBatch, type VisualAnalysisResult, type BatchAnalysisProgress } from '../services/youtubeCapture';
import { findNearbySources } from '../utils/geoUtils';
import { findRegionByName, allJejuRegions } from '../data/jejuRegions';

// 유튜브 URL 감지 함수
const isYouTubeUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com' || urlObj.hostname === 'youtu.be';
  } catch (error) {
    return false;
  }
};

// The API key is sourced from the environment variable `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Utility to convert image URL to a base64 part for Gemini API
async function urlToGenerativePart(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type;
  if (!mimeType.startsWith('image/')) {
    throw new Error('URL does not point to a valid image.');
  }
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return {
    inlineData: {
      mimeType,
      data: base64
    }
  };
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  weatherCard?: WeatherCardData;
  weatherCardCompleted?: boolean; // WeatherCard 완료 상태 추적
}

interface WeatherChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  weatherSources: WeatherSource[];
  onSaveSource: (data: Omit<WeatherSource, 'id'> & { id?: string }) => void;
  onDeleteSource: (id: string) => void;
}

const WeatherChatModal: React.FC<WeatherChatModalProps> = ({ isOpen, onClose, weatherSources, onSaveSource, onDeleteSource }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [isLiveViewOpen, setIsLiveViewOpen] = useState(false);
  const [sourceToEdit, setSourceToEdit] = useState<WeatherSource | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 모달이 열릴 때마다 새로운 채팅 세션 시작
  useEffect(() => {
    if (isOpen) {
        const systemInstruction = `You are '제주실시간날씨전용챗봇', a specialized AI assistant for providing real-time weather information for Jeju Island based on a list of live video streams.
- Your answers MUST be in Korean.
- Your primary function is to answer questions about the current weather at specific locations in Jeju.
- You are given a list of available live camera locations. This is your ONLY source of truth.
- IMPORTANT: You only work with YouTube live streams. You cannot process HLS streams or other video formats due to technical limitations.

**SPECIAL VISUAL SEARCH FEATURE**: When a user asks about visual conditions across multiple locations (e.g., "파란하늘 보이는곳 찾아줘", "지금 비오는곳 어디야?", "맑은 곳 찾아줘"), you MUST respond with a JSON object for batch analysis:
\`\`\`json
{
  "visualSearch": {
    "query": "파란하늘",
    "responseText": "등록된 모든 지역의 실시간 영상을 분석해서 파란하늘이 보이는 곳들을 찾아드릴게요. 잠시만 기다려주세요..."
  }
}
\`\`\`

**DIRECTION-BASED QUERIES**: When a user asks about directional weather (e.g., "동쪽 날씨", "서쪽은 어때?", "북부 지역 날씨"), you MUST respond with a JSON object:
\`\`\`json
{
  "directionInquiry": {
    "direction": "동",
    "responseText": "동쪽 지역의 등록된 날씨 정보 소스들을 보여드릴게요."
  }
}
\`\`\`

**SINGLE LOCATION WEATHER**: When a user asks about the weather in a specific location (e.g., "한라산 날씨 어때?", "성산읍은 지금 비 와?", "백록담", "1100고지", "노형동 날씨"), you MUST respond with ONLY a JSON object:
\`\`\`json
{
  "weatherInquiry": {
    "locationQuery": "한라산",
    "responseText": "해당 지역의 현재 날씨를 실시간 영상으로 확인해 드릴게요. 잠시만 기다려주세요..."
  }
}
\`\`\`

**LOCATION WITH GEOCODING**: For broad area queries (e.g., "노형동", "애월읍", "조천읍"), you MUST also get GPS coordinates:
\`\`\`json
{
  "geoInquiry": {
    "locationQuery": "노형동",
    "responseText": "노형동 지역의 날씨를 확인하기 위해 주변 CCTV들을 찾아보겠습니다..."
  }
}
\`\`\`

**LOCATION KEYWORDS**: Handle these keyword aliases for Hallasan:
- 한라산, 백록담, 1100고지, 어승생악, 윗세오름 → Match sources with these keywords or similar titles

**Visual Search Keywords to recognize**:
- 파란하늘, 맑은하늘, 파란색하늘 -> "파란하늘"
- 비, 우천, 빗방울, 비오는 -> "비오는날씨"
- 흐린, 구름, 구름많음, 흐릿 -> "흐린날씨"
- 일몰, 노을, 석양 -> "일몰"
- 안개, 뿌연, 시야불량 -> "안개"

- If a user asks about a location NOT on your list, you MUST state that you do not have real-time information for that specific place and then list the locations you DO have information for.
- For general conversation, respond naturally in plain text. DO NOT use JSON.`;

        const newChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction }
        });
        setChat(newChat);
        setMessages([
            { role: 'ai', content: '안녕하세요! 제주 실시간 날씨 챗봇입니다. 알고 싶은 지역의 날씨를 물어보세요. (예: 한라산 날씨 어때?)' }
        ]);
    } else {
        // 모달이 닫힐 때 채팅 세션 초기화
        setChat(null);
        setMessages([]);
        setInputValue('');
        setIsLoading(false);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !chat) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    const context = `
# AVAILABLE REAL-TIME CAMERA LOCATIONS
This is the only data you can use to answer questions about current weather conditions.

\`\`\`json
${JSON.stringify(weatherSources.filter(s => isYouTubeUrl(s.youtubeUrl)).map(s => ({ id: s.id, title: s.title })), null, 2)}
\`\`\`

# USER'S QUESTION
${currentInput}
    `;

    try {
        // Add a temporary AI message that will be filled by the stream
        setMessages(prev => [...prev, { role: 'ai', content: '' }]);
        const stream = await chat.sendMessageStream({ message: context });
        
        let fullResponseText = '';

        for await (const chunk of stream) {
            fullResponseText += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'ai') {
                    lastMessage.content = fullResponseText;
                }
                return newMessages;
            });
        }

        // After stream, parse the full response for the JSON command
        const jsonMatch = fullResponseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsedJson = JSON.parse(jsonMatch[1]);

                // Visual Search 처리
                if (parsedJson.visualSearch) {
                    const { query, responseText } = parsedJson.visualSearch;

                    // 2. 배치 분석 시작 - 유튜브 소스만 사용 (먼저 정의)
                    const sourcesForAnalysis = weatherSources
                        .filter(s => isYouTubeUrl(s.youtubeUrl)) // 유튜브 소스만 필터링
                        .map(s => ({
                            id: s.id,
                            title: s.title,
                            youtubeUrl: s.youtubeUrl
                        }));

                    // 1. 응답 메시지 업데이트 (실제 지역 개수 포함)
                    const actualResponseText = responseText.replace('등록된 모든 지역의', `등록된 ${sourcesForAnalysis.length}개 지역의`);
                    setMessages(prev => {
                        const updatedMessages = [...prev];
                        updatedMessages[updatedMessages.length - 1] = { role: 'ai', content: actualResponseText };
                        return updatedMessages;
                    });

                    let progressMessage = '';

                    // 2. 진행상황만 보여주는 메시지 추가
                    setMessages(prev => [...prev, {
                        role: 'ai',
                        content: `🔍 ${sourcesForAnalysis.length}개 지역 분석 중...`
                    }]);

                    // 3. 배치 분석 시작 (진행상황 콜백 없이)
                    analyzeThumbnailsBatch(sourcesForAnalysis, query, (progress: BatchAnalysisProgress) => {
                        // 진행상황만 업데이트 (중간 결과는 표시하지 않음)
                        setMessages(prev => {
                            const updatedMessages = [...prev];
                            const lastIndex = updatedMessages.length - 1;
                            if (lastIndex >= 0 && updatedMessages[lastIndex].content.includes('🔍')) {
                                updatedMessages[lastIndex].content = `🔍 분석 진행 중... (${progress.completed}/${progress.total})`;
                            }
                            return updatedMessages;
                        });

                        // 분석 완료 시에만 최종 결과 표시
                        if (progress.isComplete) {
                            // 진행상황 메시지 제거하고 최종 결과만 표시
                            setTimeout(() => {
                                const finalMessage = progress.matches.length > 0 ?
                                    `🎯 **전체 ${progress.total}개 지역 분석 완료!**\n\n**"${query}" 조건을 만족하는 ${progress.matches.length}개 지역을 발견했습니다:**\n\n` +
                                    progress.matches.map((m, index) =>
                                        `${index + 1}. **${m.sourceTitle}** (신뢰도 ${m.confidence}%)`
                                    ).join('\n') +
                                    `\n\n📌 **어느 지역을 자세히 보여드릴까요?**\n지역명을 말씀해주시면 실시간 영상 분석을 해드릴게요!` :
                                    `🔍 **전체 ${progress.total}개 지역 분석 완료!**\n\n😔 아쉽게도 현재 "${query}" 조건에 맞는 지역을 찾지 못했습니다.\n\n다른 조건으로 다시 검색하거나 특정 지역명을 말씀해주세요.`;

                                setMessages(prev => {
                                    const updatedMessages = [...prev];
                                    // 진행상황 메시지를 최종 결과로 교체
                                    const lastIndex = updatedMessages.length - 1;
                                    if (lastIndex >= 0 && updatedMessages[lastIndex].content.includes('🔍')) {
                                        updatedMessages[lastIndex] = { role: 'ai', content: finalMessage };
                                    } else {
                                        updatedMessages.push({ role: 'ai', content: finalMessage });
                                    }
                                    return updatedMessages;
                                });
                            }, 1000);
                        }
                    }).catch(error => {
                        console.error('배치 분석 실패:', error);
                        setMessages(prev => [...prev, {
                            role: 'ai',
                            content: '😓 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
                        }]);
                    });
                }
                // Direction-based inquiry 처리
                else if (parsedJson.directionInquiry) {
                    const { direction, responseText } = parsedJson.directionInquiry;
                    const directionSources = weatherSources.filter(s =>
                        s.direction === direction && isYouTubeUrl(s.youtubeUrl)
                    );

                    setMessages(prev => {
                        const updatedMessages = [...prev];
                        if (directionSources.length > 0) {
                            const sourcesList = directionSources.map((s, index) =>
                                `${index + 1}. ${s.title}`
                            ).join('\n');
                            updatedMessages[updatedMessages.length - 1] = {
                                role: 'ai',
                                content: `${responseText}\n\n**${direction}쪽 지역 (${directionSources.length}개소):**\n${sourcesList}\n\n📌 **특정 지역의 날씨를 보려면 지역명을 말씀해주세요!**`
                            };
                        } else {
                            updatedMessages[updatedMessages.length - 1] = {
                                role: 'ai',
                                content: `죄송합니다. ${direction}쪽 지역으로 등록된 날씨 정보 소스가 없습니다. 다른 방향을 시도해보거나 구체적인 지역명을 말씀해주세요.`
                            };
                        }
                        return updatedMessages;
                    });
                }
                // Geo-based inquiry 처리 (하드코딩된 지역 데이터 사용)
                else if (parsedJson.geoInquiry) {
                    const { locationQuery, responseText } = parsedJson.geoInquiry;

                    setMessages(prev => {
                        const updatedMessages = [...prev];
                        updatedMessages[updatedMessages.length - 1] = { role: 'ai', content: responseText };
                        return updatedMessages;
                    });

                    // 하드코딩된 지역 데이터에서 먼저 찾기
                    const foundRegion = findRegionByName(locationQuery);

                    if (foundRegion) {
                        // 주변 CCTV 찾기
                        const nearbyOptions = findNearbySources(
                            foundRegion.lat,
                            foundRegion.lng,
                            weatherSources.filter(s => isYouTubeUrl(s.youtubeUrl))
                        );

                        if (nearbyOptions.length > 0) {
                            const optionsList = nearbyOptions.map((option, index) =>
                                `${index + 1}. **${option.source.title}** (${option.direction} ${option.distance}km)`
                            ).join('\n');

                            const landmarkInfo = foundRegion.landmarks ? ` (${foundRegion.landmarks[0]} 기준)` : '';

                            setMessages(prev => [...prev, {
                                role: 'ai',
                                content: `📍 **${locationQuery}**${landmarkInfo}의 날씨를 확인할 수 있는 주변 CCTV들입니다:\n\n${optionsList}\n\n🎯 **어느 지역의 실시간 영상을 보시겠어요?**\n지역명을 말씀해주시면 바로 분석해드릴게요!`
                            }]);
                        } else {
                            setMessages(prev => [...prev, {
                                role: 'ai',
                                content: `죄송합니다. ${locationQuery} 주변에 등록된 CCTV를 찾을 수 없습니다. CCTV에 GPS 좌표가 설정되지 않았을 수 있습니다.`
                            }]);
                        }
                    } else {
                        // 하드코딩된 데이터에 없으면 AI에게 시도 (기존 로직)
                        const geoPrompt = `제주도 ${locationQuery}의 대표적인 GPS 좌표를 알려주세요.
                        JSON 형식으로만 응답해주세요:
                        {
                          "latitude": 33.xxxx,
                          "longitude": 126.xxxx,
                          "landmark": "대표적인 랜드마크나 중심지"
                        }`;

                        try {
                            const geoResponse = await ai.models.generateContent({
                                model: 'gemini-2.5-flash',
                                contents: { parts: [{ text: geoPrompt }] }
                            });

                            const geoText = geoResponse.text;
                            const geoMatch = geoText.match(/\{[\s\S]*\}/);

                            if (geoMatch) {
                                const geoData = JSON.parse(geoMatch[0]);
                                const { latitude, longitude, landmark } = geoData;

                                const nearbyOptions = findNearbySources(
                                    latitude,
                                    longitude,
                                    weatherSources.filter(s => isYouTubeUrl(s.youtubeUrl))
                                );

                                if (nearbyOptions.length > 0) {
                                    const optionsList = nearbyOptions.map((option, index) =>
                                        `${index + 1}. **${option.source.title}** (${option.direction} ${option.distance}km)`
                                    ).join('\n');

                                    setMessages(prev => [...prev, {
                                        role: 'ai',
                                        content: `📍 **${locationQuery}** (${landmark} 기준)의 날씨를 확인할 수 있는 주변 CCTV들입니다:\n\n${optionsList}\n\n🎯 **어느 지역의 실시간 영상을 보시겠어요?**\n지역명을 말씀해주시면 바로 분석해드릴게요!`
                                    }]);
                                } else {
                                    setMessages(prev => [...prev, {
                                        role: 'ai',
                                        content: `죄송합니다. ${locationQuery} 주변에 등록된 CCTV를 찾을 수 없습니다.`
                                    }]);
                                }
                            } else {
                                throw new Error('GPS 좌표 파싱 실패');
                            }
                        } catch (error) {
                            console.error('AI Geocoding 실패:', error);
                            setMessages(prev => [...prev, {
                                role: 'ai',
                                content: `죄송합니다. "${locationQuery}"은 지원하지 않는 지역입니다.\n\n**지원되는 주요 지역:**\n${allJejuRegions.slice(0, 10).map(r => r.name).join(', ')} 등\n\n더 구체적인 지역명이나 방향(동쪽, 서쪽)으로 문의해주세요.`
                            }]);
                        }
                    }
                }
                // Single Location Weather 처리 - 키워드 매칭으로 변경
                else if (parsedJson.weatherInquiry) {
                    const { locationQuery, responseText } = parsedJson.weatherInquiry;

                    // 키워드 매칭으로 소스 찾기
                    const matchedSource = weatherSources.find(s => {
                        if (!isYouTubeUrl(s.youtubeUrl)) return false;

                        const query = locationQuery.toLowerCase();
                        const title = s.title.toLowerCase();

                        // 제목에서 직접 매칭
                        if (title.includes(query)) return true;

                        // 키워드 배열에서 매칭
                        if (s.keywords) {
                            return s.keywords.some(keyword =>
                                keyword.toLowerCase().includes(query) ||
                                query.includes(keyword.toLowerCase())
                            );
                        }

                        return false;
                    });

                    const source = matchedSource;
                    if (source) {
                        // 1. Replace the streamed message with the introductory text
                        // 2. Add a new message with the WeatherCard component
                        setMessages(prev => {
                            const updatedMessages = [...prev];
                            updatedMessages[updatedMessages.length - 1] = { role: 'ai', content: responseText };

                            const weatherCardData: WeatherCardData = {
                                status: 'analyzing',
                                sourceTitle: source.title,
                                imageUrl: 'https://i.imgur.com/gT3gA2t.png', // 임시, 실제 캡처 후 교체
                                youtubeUrl: source.youtubeUrl, // 유튜브 URL 추가
                                weatherData: {
                                    temp: '분석중...',
                                    humidity: '분석중...',
                                    wind: '분석중...'
                                }
                            };
                            updatedMessages.push({ role: 'ai', content: '', weatherCard: weatherCardData });
                            return updatedMessages;
                        });

                        // 백그라운드에서 실제 YouTube 캡처 시작
                        captureWeatherScene(source.youtubeUrl, source.title).then(captureResult => {
                            if (captureResult) {
                                // 캡처 완료 후 WeatherCard 데이터 업데이트
                                setMessages(prev => {
                                    const updated = [...prev];
                                    const cardMessage = updated[updated.length - 1];
                                    if (cardMessage.weatherCard) {
                                        cardMessage.weatherCard.imageUrl = captureResult.imageUrl;
                                        cardMessage.weatherCard.weatherData = {
                                            temp: captureResult.weatherData ? captureResult.weatherData.temp : '정보없음',
                                            humidity: captureResult.weatherData ? captureResult.weatherData.humidity : '정보없음',
                                            wind: captureResult.weatherData ? captureResult.weatherData.wind : '정보없음',
                                            weather: captureResult.weatherData ? captureResult.weatherData.weather : '정보없음',
                                            location: captureResult.weatherData ? captureResult.weatherData.location : '정보없음'
                                        };
                                    }
                                    return updated;
                                });
                            }
                        }).catch(error => {
                            console.error('YouTube 캡처 실패:', error);
                        });
                    } else {
                        // 매칭되는 소스를 찾지 못한 경우
                        setMessages(prev => {
                            const updatedMessages = [...prev];
                            const availableSources = weatherSources
                                .filter(s => isYouTubeUrl(s.youtubeUrl))
                                .map(s => s.title)
                                .join(', ');

                            updatedMessages[updatedMessages.length - 1] = {
                                role: 'ai',
                                content: `죄송합니다. "${locationQuery}"에 해당하는 지역을 찾을 수 없습니다.\n\n**현재 이용 가능한 지역:**\n${availableSources}\n\n위 지역 중 하나를 선택하거나 방향(동쪽, 서쪽, 남쪽, 북쪽)으로 문의해주세요.`
                            };
                            return updatedMessages;
                        });
                    }
                }
            } catch (e) {
                console.error("Failed to parse JSON from weather AI:", e);
                // The message already contains the raw text, which is a good fallback.
            }
        }
    } catch (error) {
        console.error("Weather chat error:", error);
        setMessages(prev => {
             const newMessages = [...prev];
             const lastMessage = newMessages[newMessages.length - 1];
             if (lastMessage && lastMessage.role === 'ai' && lastMessage.content === '') {
                lastMessage.content = '죄송합니다, 답변을 가져오는 중 오류가 발생했습니다.';
             } else {
                newMessages.push({ role: 'ai', content: '죄송합니다, 답변을 가져오는 중 오류가 발생했습니다.' });
             }
             return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleWeatherCardComplete = async (source: WeatherCardData, messageIndex: number) => {
    // 이미 완료된 WeatherCard라면 재실행하지 않음
    const message = messages[messageIndex];
    if (message?.weatherCardCompleted) {
      return;
    }

    // 메시지를 완료 상태로 마킹
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages[messageIndex]) {
        newMessages[messageIndex].weatherCardCompleted = true;
      }
      return newMessages;
    });

    setIsLoading(true);
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
        const imagePart = await urlToGenerativePart(source.imageUrl);

        // 기상 데이터 정보를 텍스트로 준비
        const weatherInfo = source.weatherData ? `
실시간 기상청 관측 데이터:
- 현재 기온: ${source.weatherData.temp}
- 습도: ${source.weatherData.humidity}
- 풍속: ${source.weatherData.wind}

이 데이터는 기상청 공식 관측소에서 제공하는 정확한 수치입니다.
        ` : '기상청 데이터를 가져올 수 없었습니다.';

        const textPart = {
            text: `당신은 제주도 전문 기상 캐스터입니다. 간결하고 명확한 브리핑을 제공해주세요.

현재 분석 자료:
📍 ${source.sourceTitle} 실시간 영상
${weatherInfo}

다음 형식으로 간결하게 브리핑해주세요:

🌤️ **현재 날씨 상황**
- 하늘 상태와 구름량을 한 문장으로
- 가시거리나 특이사항이 있다면 간단히

📊 **기상 데이터**
- 현재 기온의 특징 (평년 대비, 체감온도 등)
- 습도와 바람의 현재 상태

💡 **외출 팁**
- 현재 날씨에 맞는 복장이나 주의사항을 1-2줄로

총 5-6줄 이내로 간결하게 작성해주세요.`
        };

        const response = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        let fullResponseText = '';
        for await (const chunk of response) {
            fullResponseText += chunk.text;
            setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage && lastMessage.role === 'ai') {
                    lastMessage.content = fullResponseText;
                }
                return newMessages;
            });
        }
    } catch (error) {
        console.error("Image analysis error:", error);
         setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'ai') {
                lastMessage.content = '죄송합니다, 이미지 분석 중 오류가 발생했습니다.';
            }
            return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setSourceToEdit(null);
    setIsAddModalOpen(true);
  };
  
  const handleOpenEditModal = (source: WeatherSource) => {
    setSourceToEdit(source);
    setIsListModalOpen(false); // Close list modal
    setIsAddModalOpen(true); // Open edit modal
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="제주실시간날씨전용챗봇">
        <div className="flex flex-col h-[70vh] max-h-[600px]">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b gap-y-2">
            <h4 className="text-lg font-semibold text-gray-700">정보 소스 관리</h4>
            <div className="flex space-x-2 flex-wrap justify-end gap-y-2">
              <Button onClick={() => setIsListModalOpen(true)} variant="secondary">목록 보기 및 편집</Button>
              <Button onClick={handleOpenAddModal} size="normal">
                영상 주소 입력하기
              </Button>
              <Button 
                onClick={() => setIsLiveViewOpen(true)} 
                className="bg-sky-500 text-white hover:bg-sky-600 focus:ring-sky-400"
              >
                실시간 영상으로 날씨보기
              </Button>
            </div>
          </header>
          
          <main className="flex-1 my-4 p-2 overflow-y-auto bg-gray-100 rounded-lg">
            <div className="space-y-4 p-2">
              {messages.map((msg, index) => (
                <div key={index}>
                    {msg.role === 'user' ? (
                        <div className="flex items-end gap-2 justify-end">
                            <div className="px-4 py-2 rounded-2xl max-w-xs md:max-w-sm break-words bg-indigo-600 text-white rounded-br-none">
                                {msg.content}
                            </div>
                        </div>
                    ) : (() => {
                        const isLastAIMessage = index === messages.length - 1;
                        const showTypingIndicator = isLoading && isLastAIMessage && !msg.content && !msg.weatherCard;
                        return (
                            <div className="flex items-end gap-2 justify-start">
                                <div className="max-w-md md:max-w-lg w-full">
                                    {msg.content ? (
                                        <div className="px-4 py-3 rounded-2xl whitespace-pre-wrap break-words bg-white text-gray-800 border rounded-bl-none mb-2 leading-relaxed">
                                            {msg.content}
                                        </div>
                                    ) : showTypingIndicator ? (
                                        <div className="px-4 py-3 rounded-2xl bg-white text-gray-800 border rounded-bl-none mb-2">
                                            <div className="flex items-center space-x-1.5">
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    ) : null}
                                    {msg.weatherCard && <WeatherCard initialData={msg.weatherCard} onComplete={() => handleWeatherCardComplete(msg.weatherCard!, index)} skipAnimation={msg.weatherCardCompleted || false} />}
                                </div>
                            </div>
                        );
                    })()}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="날씨에 대해 물어보세요..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={isLoading}
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} className="rounded-full !px-4 !py-2">
                전송
              </Button>
            </div>
          </footer>
        </div>
      </Modal>

      <WeatherSourceListModal
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        sources={weatherSources}
        onEdit={handleOpenEditModal}
        onDelete={onDeleteSource}
      />

      <AddWeatherSourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={onSaveSource}
        initialData={sourceToEdit}
      />
      
      <LiveWeatherViewModal
        isOpen={isLiveViewOpen}
        onClose={() => setIsLiveViewOpen(false)}
        sources={weatherSources}
      />
    </>
  );
};

export default WeatherChatModal;