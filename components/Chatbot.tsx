import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { Place, UserLocation } from '../types';
import Button from './common/Button';
import LocationPermissionModal from './LocationPermissionModal';
import { getCurrentLocation, getLocationErrorMessage, formatLocationForDisplay } from '../utils/locationUtils';

// The API key is sourced from the environment variable `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

interface ChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  spots: Place[];
  onNavigateToSpot: (placeId: string) => void;
}

interface Recommendation {
  place_id: string;
  place_name: string;
  summary: string;
}

interface Message {
  role: 'user' | 'ai';
  content: string;
  recommendations?: Recommendation[];
}


const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, spots, onNavigateToSpot }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLocationRequest = () => {
    setIsLocationModalOpen(true);
  };

  const handleAllowLocation = async () => {
    setIsLocationLoading(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setIsLocationModalOpen(false);

      // 위치 정보가 반영되었다는 메시지 추가
      setMessages(prev => [...prev, {
        role: 'ai',
        content: `📍 현재 위치가 반영되었습니다!\n${formatLocationForDisplay(location)}\n\n이제 위치 기반 맞춤 추천을 제공할 수 있습니다. 무엇을 도와드릴까요?`
      }]);
    } catch (error: any) {
      alert(getLocationErrorMessage(error));
    } finally {
      setIsLocationLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !chat) {
        const newChat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: `
                    You are a friendly and helpful conversational assistant for Jeju DB, a Jeju travel platform. Your name is 'Jeju DB AI 어시스턴트'.
                    - Your answers MUST be in Korean.
                    - Engage in natural, general conversation.
                    - CRITICAL RULE: If a user's request for a recommendation is too vague or lacks context (e.g., "오름 추천해줘", "카페 찾아줘"), you MUST ask a clarifying question to get more information. DO NOT recommend anything until you have enough context. Good clarifying questions are like "물론이죠! 혹시 찾으시는 특정 지역이 있으신가요?" or "어떤 분위기의 카페를 원하세요?".
                    - WHEN a user asks for travel recommendations and you have enough context, you MUST follow these steps:
                      1. Use the provided JSON data of travel spots as your ONLY source of truth.
                      2. Identify 1 to 3 relevant spots based on the user's query.
                      3. For EACH recommended spot, write a concise, one-sentence summary.
                      4. Formulate your final response as a brief introductory sentence, followed by a JSON code block.
                      5. The JSON object MUST have a single key "recommendations", which is an array of objects.
                      6. Each object in the array MUST have three keys: "place_id", "place_name", and "summary".
                    - DO NOT recommend spots if they are not in the provided JSON data. State that you don't have information instead.
                    - DO NOT add any text after the JSON code block.

                    EXAMPLE RESPONSE for a recommendation query (after getting enough context):
                    애월읍 근처에서 가볼 만한 곳을 몇 군데 추천해 드릴게요!

                    \`\`\`json
                    {
                      "recommendations": [
                        {
                          "place_id": "P_20250920T004432_YK",
                          "place_name": "새별오름",
                          "summary": "가을 억새 풍경이 아름다운 제주의 대표적인 오름입니다."
                        },
                        {
                          "place_id": "P_20250920T005703_YR",
                          "place_name": "제주당",
                          "summary": "새별오름 뷰와 넓은 잔디밭이 특징인 대형 베이커리 카페입니다."
                        }
                      ]
                    }
                    \`\`\`

                    - When users ask about weather information, politely explain that you only provide information about registered travel spots and suggest they use the weather chatbot for weather-related queries.
                `
            }
        });
        setChat(newChat);
        setMessages([
            { role: 'ai', content: '안녕하세요! Jeju DB AI 어시스턴트입니다. 라이브러리에 저장된 스팟 정보에 대해 무엇이든 물어보세요.' }
        ]);
    }
  }, [isOpen, chat]);


  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !chat) return;

    const userMessage: Message = { role: 'user', content: inputValue };
    const currentInput = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // 위치 기반 질문인지 확인
    const isLocationBasedQuery = userLocation && (
      currentInput.includes('가까운') ||
      currentInput.includes('근처') ||
      currentInput.includes('주변') ||
      currentInput.includes('바다') ||
      currentInput.includes('숙소') ||
      currentInput.includes('거리')
    );

    // 위치 기반 질문이면 가까운 스팟들만 필터링
    let relevantSpots = spots;
    if (isLocationBasedQuery && userLocation) {
      relevantSpots = spots
        .filter(spot => spot.gps?.latitude && spot.gps?.longitude)
        .map(spot => {
          const distance = Math.sqrt(
            Math.pow(userLocation.latitude - spot.gps!.latitude, 2) +
            Math.pow(userLocation.longitude - spot.gps!.longitude, 2)
          ) * 111; // 대략적인 km 계산
          return { ...spot, distance };
        })
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10); // 가장 가까운 10개만
    }

    const locationContext = userLocation ? `
        # USER'S CURRENT LOCATION
        The user has shared their current location:
        - Latitude: ${userLocation.latitude}
        - Longitude: ${userLocation.longitude}
        - Accuracy: ${userLocation.accuracy}m

        Use this information to provide location-based recommendations and calculate distances to nearby spots.
    ` : '';

    const promptWithContext = `
        # AVAILABLE DATA (Jeju travel spots)
        Here is the JSON data you can use to answer travel-related questions. For general conversation, you do not need to use this data.
        ${isLocationBasedQuery ? '# FILTERED NEARBY SPOTS (within reasonable distance)' : '# ALL AVAILABLE SPOTS'}

        \`\`\`json
        ${JSON.stringify(relevantSpots, null, 2)}
        \`\`\`
        ${locationContext}
        # USER'S QUESTION
        ${currentInput}
    `;
    
    setMessages(prev => [...prev, { role: 'ai', content: '' }]);

    try {
        const stream = await chat.sendMessageStream({ message: promptWithContext });
        
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

        // After stream is finished, parse the full response for structured data
        const jsonMatch = fullResponseText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                const parsedJson = JSON.parse(jsonMatch[1]);

                // 기존 recommendations 처리
                if (parsedJson.recommendations) {
                    const introText = fullResponseText.substring(0, jsonMatch.index).trim();
                    setMessages(prev => {
                        const newMessages = [...prev];
                        const lastMessage = newMessages[newMessages.length - 1];
                        if (lastMessage && lastMessage.role === 'ai') {
                            lastMessage.content = introText;
                            lastMessage.recommendations = parsedJson.recommendations;
                        }
                        return newMessages;
                    });
                }
            } catch (e) {
                console.error("Failed to parse JSON from AI response:", e);
                // The message content is already set to the full text, so it will just display as plain text.
            }
        }
    } catch (error) {
        console.error("Chat error:", error);
        setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === 'ai') {
                lastMessage.content = '죄송합니다, 답변을 가져오는 중 오류가 발생했습니다.';
            }
            return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 transition-transform transform-gpu">
      <header className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-2xl">
        <h3 className="text-lg font-bold text-gray-800">Jeju DB AI 어시스턴트</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleLocationRequest}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              userLocation
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            title={userLocation ? '위치 정보 반영됨' : '내 위치 반영하기'}
          >
            {userLocation ? '📍 위치 반영됨' : '📍 내 위치 반영'}
          </button>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="Close chat">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </header>
      
      <main className="flex-1 p-4 overflow-y-auto bg-gray-100">
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isLastAIMessage = msg.role === 'ai' && index === messages.length - 1;
            const showTypingIndicator = isLoading && isLastAIMessage && !msg.content && !msg.recommendations;

            return (
              <div key={index}>
                <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.content ? (
                    <div className={`px-4 py-2 rounded-2xl max-w-xs md:max-w-sm break-words ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-gray-800 border rounded-bl-none'}`}>
                      {msg.content}
                    </div>
                  ) : showTypingIndicator ? (
                    <div className="px-4 py-3 rounded-2xl bg-white text-gray-800 border rounded-bl-none">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  ) : null}
                </div>
                {msg.recommendations && (
                  <div className="mt-2 space-y-2">
                    {msg.recommendations.map(rec => (
                      <div key={rec.place_id} className="p-3 bg-white border rounded-lg shadow-sm">
                        <h4 className="font-bold text-gray-800">{rec.place_name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{rec.summary}</p>
                        <Button
                          onClick={() => onNavigateToSpot(rec.place_id)}
                          variant="secondary"
                          size="normal"
                          className="mt-3 w-full"
                        >
                          자세히 보기
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer className="p-3 border-t bg-white rounded-b-2xl">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isLoading}
          />
          <Button onClick={handleSendMessage} disabled={isLoading || !inputValue.trim()} className="rounded-full !px-4 !py-2">
            전송
          </Button>
        </div>
      </footer>

      <LocationPermissionModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onAllowLocation={handleAllowLocation}
        isLoading={isLocationLoading}
      />
    </div>
  );
};

export default Chatbot;