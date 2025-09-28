import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import type { Place, FixedSpot } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import CheckboxGroup from './common/CheckboxGroup';
import SpotSearchModal from './SpotSearchModal';

// The API key is sourced from the environment variable `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- New 4-Step Type Definitions ---
interface TripPlanFormState {
  // Step 1: Time Frame
  nights: number;
  days: number;
  arrivalHour: string;
  arrivalMinute: string;
  departureHour: string;
  departureMinute: string;

  // Step 2: Fixed Points
  accommodationStatus: 'booked' | 'not_booked';
  fixedAccommodations: FixedSpot[];
  fixedAttractions: FixedSpot[];
  fixedRestaurants: FixedSpot[];
  mustTryFoods: string[];

  // Step 3: Route Constraints
  dinnerTravelTime: '30min' | '1hour' | '1hour30min';
  nextDayConsideration: 'same_day_finish' | 'next_day_start';
  postLunchCafe: boolean;

  // Step 4: Personal Preferences
  companions: string[];
  transportation: string;
  pace: string;
  interests: string[];
  interestWeights: { [key: string]: number };
  tripStyle: string;
}

const initialFormState: TripPlanFormState = {
  // Step 1: Time Frame
  nights: 2,
  days: 3,
  arrivalHour: '10',
  arrivalMinute: '00',
  departureHour: '18',
  departureMinute: '00',

  // Step 2: Fixed Points
  accommodationStatus: 'not_booked',
  fixedAccommodations: [],
  fixedAttractions: [],
  fixedRestaurants: [],
  mustTryFoods: [],

  // Step 3: Route Constraints
  dinnerTravelTime: '1hour',
  nextDayConsideration: 'same_day_finish',
  postLunchCafe: true,

  // Step 4: Personal Preferences
  companions: [],
  transportation: '렌터카',
  pace: '보통',
  interests: [],
  interestWeights: {},
  tripStyle: '중간 (적당히 절약 + 포인트 투자)',
};

// Step 1 Options
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

// Step 2 Options
const MUST_TRY_FOODS = ["흑돼지", "갈치조림", "전복죽", "고등어회", "옥돔구이", "성게미역국", "몸국", "빙떡", "호떡", "오메기떡"];

// Step 3 Options
const DINNER_TRAVEL_OPTIONS = [
  { value: '30min', label: '30분 이내 (가까운 곳 위주)' },
  { value: '1hour', label: '1시간 이내 (적당히 멀어도 OK)' },
  { value: '1hour30min', label: '1시간 30분 이내 (멀어도 괜찮음)' }
];
const NEXT_DAY_OPTIONS = [
  { value: 'same_day_finish', label: '당일 마무리 중시 (숙소 가까운 곳에서 끝내기)' },
  { value: 'next_day_start', label: '다음날 시작 고려 (다음날 첫 일정 편의성 우선)' }
];

// Step 4 Options
const COMPANION_OPTIONS = ["혼자", "친구와", "연인과", "아이를 동반한 가족", "부모님을 모시고", "반려견과 함께", "회사 동료와"];
const TRANSPORTATION_OPTIONS = ["렌터카", "대중교통", "택시/투어 상품 이용"];
const PACE_OPTIONS = ["여유롭게", "보통", "촘촘하게"];
const INTEREST_OPTIONS = ["#자연 (숲, 오름, 바다)", "#오션뷰 (카페, 식당, 숙소)", "#요즘 뜨는 핫플", "#쇼핑 & 소품샵", "#박물관 & 미술관", "#역사 & 문화 유적", "#짜릿한 액티비티", "#걷기 좋은 길"];
const TRIP_STYLE_OPTIONS = ["전체 저예산 위주", "중간 (적당히 절약 + 포인트 투자)", "고급 (숙소·식사·체험 모두 고급 위주)"];

// --- Helper Components ---
const getIconForLine = (line: string): string => {
  const lowerLine = line.toLowerCase();
  if (lowerLine.includes('공항') || lowerLine.includes('도착') || lowerLine.includes('출발')) return '✈️';
  if (lowerLine.includes('식사') || lowerLine.includes('맛집') || lowerLine.includes('레스토랑') || lowerLine.includes('아침') || lowerLine.includes('점심') || lowerLine.includes('저녁')) return '🍴';
  if (lowerLine.includes('오름') || lowerLine.includes('해변') || lowerLine.includes('자연') || lowerLine.includes('숲') || lowerLine.includes('공원')) return '🏞️';
  if (lowerLine.includes('숙소') || lowerLine.includes('체크인') || lowerLine.includes('호텔') || lowerLine.includes('펜션')) return '🏨';
  if (lowerLine.includes('카페')) return '☕️';
  if (lowerLine.includes('쇼핑') || lowerLine.includes('소품샵')) return '🛍️';
  if (lowerLine.includes('박물관') || lowerLine.includes('미술관')) return '🏛️';
  if (lowerLine.includes('액티비티') || lowerLine.includes('체험')) return '🎢';
  if (lowerLine.includes('이동') || lowerLine.includes('드라이브')) return '🚗';
  return '📍';
};

const FormattedMessageContent: React.FC<{ content: string }> = ({ content }) => {
    const daySections = content.split(/(?=### .*?일차)/).filter(Boolean);

    if (daySections.length === 0) {
        return <p className="text-gray-800 whitespace-pre-wrap">{content}</p>;
    }

    return (
        <div className="space-y-6">
            {daySections.map((section, index) => {
                const lines = section.trim().split('\n');
                const titleLine = lines[0];
                const contentLines = lines.slice(1);

                return (
                    <div key={index} className="relative bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 p-6 rounded-2xl border border-blue-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="absolute -top-3 left-6">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md">
                                Day {index + 1}
                            </div>
                        </div>

                        <div className="pt-4">
                            <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                                {titleLine.replace('### ', '')}
                            </h3>

                            <div className="space-y-3">
                                {contentLines.map((line, lineIndex) => {
                                    if (!line.trim()) return null;
                                    const icon = getIconForLine(line);
                                    return (
                                        <div key={lineIndex} className="flex items-start gap-3 p-3 bg-white/60 rounded-lg hover:bg-white/80 transition-colors">
                                            <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
                                            <span className="text-gray-700 leading-relaxed">{line.replace(/^[-*]\s*/, '')}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface TripPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spots: Place[];
}

const TripPlannerModal: React.FC<TripPlannerModalProps> = ({ isOpen, onClose, spots }) => {
  const [formState, setFormState] = useState<TripPlanFormState>(initialFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [finalItinerary, setFinalItinerary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // SpotSearchModal 상태들
  const [accommodationModalOpen, setAccommodationModalOpen] = useState(false);
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [attractionModalOpen, setAttractionModalOpen] = useState(false);

  const STEPS = ['timeFrame', 'fixedPoints', 'routeConstraints', 'preferences'];

  const resetState = () => {
    const systemInstruction = `You are an AI trip planner for Jeju Island named '여행일정AI'. Your goal is to create a personalized travel itinerary based on a detailed user profile. You MUST use the provided JSON data of travel spots as your only source of information for recommendations. Present the final itinerary in a clear, day-by-day format using Markdown. Each day should start with '### X일차: [Day's Theme]'. Ensure the route is geographically logical. Include suggestions for meals. Be friendly and helpful.`;
    const newChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction } });
    setChat(newChat);
    setFormState(initialFormState);
    setCurrentStep(0);
    setIsLoading(false);
    setFinalItinerary(null);
    setError(null);
  };

  useEffect(() => {
    if (isOpen) resetState();
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [finalItinerary, isLoading]);

  const handleUpdateForm = <K extends keyof TripPlanFormState>(key: K, value: TripPlanFormState[K]) => {
    setError(null);
    setFormState(prev => ({ ...prev, [key]: value }));
  };

  // SpotSearchModal 핸들러들
  const handleAccommodationComplete = (spots: FixedSpot[]) => {
    handleUpdateForm('fixedAccommodations', spots);
    setAccommodationModalOpen(false);
  };

  const handleRestaurantComplete = (spots: FixedSpot[]) => {
    handleUpdateForm('fixedRestaurants', spots);
    setRestaurantModalOpen(false);
  };

  const handleAttractionComplete = (spots: FixedSpot[]) => {
    handleUpdateForm('fixedAttractions', spots);
    setAttractionModalOpen(false);
  };

  const handleWeightChange = (changedInterest: string, rawNewValue: number) => {
    const currentWeights = formState.interestWeights;
    const interests = formState.interests;
    const newValue = Math.round(rawNewValue / 10) * 10;
    const oldValue = currentWeights[changedInterest];
    const delta = newValue - oldValue;

    if (delta === 0) return;

    const newWeights: { [key: string]: number } = { ...currentWeights };
    newWeights[changedInterest] = newValue;

    const otherInterests = interests.filter(i => i !== changedInterest);
    let remainingDelta = delta;

    if (remainingDelta > 0) {
        while (remainingDelta > 0) {
            let largestOtherInterest = otherInterests
                .filter(i => (newWeights[i] || 0) > 0)
                .sort((a, b) => (newWeights[b] || 0) - (newWeights[a] || 0))[0];

            if (!largestOtherInterest) break;

            newWeights[largestOtherInterest] -= 10;
            remainingDelta -= 10;
        }
    } else {
        while (remainingDelta < 0) {
            let smallestOtherInterest = otherInterests
                .filter(i => (newWeights[i] || 0) < 100)
                .sort((a, b) => (newWeights[a] || 0) - (newWeights[b] || 0))[0];

            if (!smallestOtherInterest) break;

            newWeights[smallestOtherInterest] += 10;
            remainingDelta += 10;
        }
    }

    handleUpdateForm('interestWeights', newWeights);
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleGenerateItinerary();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateTotalHours = () => {
    return formState.nights * 24 +
           parseInt(formState.departureHour) + parseFloat(formState.departureMinute) / 60 -
           parseInt(formState.arrivalHour) - parseFloat(formState.arrivalMinute) / 60;
  };

  const handleGenerateItinerary = async () => {
    if (!chat) return;

    setIsLoading(true);
    setError(null);

    try {
      const totalHours = calculateTotalHours();
      const spotData = JSON.stringify(spots, null, 2);

      const prompt = `
다음 정보를 바탕으로 제주도 여행 일정을 작성해주세요:

## 🕐 여행 기간 정보
- ${formState.nights}박 ${formState.days}일
- 도착시간: ${formState.arrivalHour}:${formState.arrivalMinute}
- 출발시간: ${formState.departureHour}:${formState.departureMinute}
- 총 여행시간: 약 ${totalHours.toFixed(1)}시간

## 🏨 고정 일정 (최우선 반영)
- 숙소 상태: ${formState.accommodationStatus === 'booked' ? '예약완료' : '미예약'}
${formState.accommodationStatus === 'booked' && formState.fixedAccommodations.length > 0 ?
  `- 예약된 숙소:\n${formState.fixedAccommodations.map(acc =>
    `  * ${acc.name} (${acc.address}) - GPS: ${acc.lat}, ${acc.lng}`).join('\n')}` : ''}
${formState.fixedAttractions.length > 0 ?
  `- 필수 방문 관광지:\n${formState.fixedAttractions.map(att =>
    `  * ${att.name} (${att.address}) - GPS: ${att.lat}, ${att.lng}`).join('\n')}` : '- 필수 방문 관광지: 없음'}
${formState.fixedRestaurants.length > 0 ?
  `- 필수 방문 맛집:\n${formState.fixedRestaurants.map(rest =>
    `  * ${rest.name} (${rest.address}) - GPS: ${rest.lat}, ${rest.lng}`).join('\n')}` : '- 필수 방문 맛집: 없음'}
- 꼭 먹고싶은 음식: ${formState.mustTryFoods.join(', ') || '없음'}

## 🛣️ 동선 제약조건 (중요)
- 저녁식사 이동시간: ${DINNER_TRAVEL_OPTIONS.find(opt => opt.value === formState.dinnerTravelTime)?.label}
- 숙소 이동 고려: ${NEXT_DAY_OPTIONS.find(opt => opt.value === formState.nextDayConsideration)?.label}
- 점심 후 카페 포함: ${formState.postLunchCafe ? '필수' : '선택'}

## 👥 여행 선호도
- 동행자: ${formState.companions.join(', ') || '없음'}
- 교통수단: ${formState.transportation}
- 여행 페이스: ${formState.pace}
- 관심사: ${formState.interests.join(', ') || '없음'}
- 여행 스타일: ${formState.tripStyle}

## 📋 일정 작성 규칙
1. **숙소를 중심으로 한 효율적 동선 설계**
2. **점심 후 ${formState.postLunchCafe ? '반드시' : '가능하면'} 카페 포함**
3. **저녁식사는 ${formState.dinnerTravelTime} 기준으로 배치**
4. **다음날 일정을 고려한 숙소 이동**
5. **페이스에 따른 체류시간 조절**:
   - 여유롭게: 기본 시간 + 30%
   - 보통: 기본 시간
   - 촘촘하게: 기본 시간 - 20%, 더 많은 스팟

다음 JSON 데이터의 스팟들만 사용해서 일정을 만들어주세요:

${spotData}
`;

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const text = response.text();

      setFinalItinerary(text);
    } catch (err) {
      console.error('Error generating itinerary:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const renderCurrentStep = () => {
    const currentStepName = STEPS[currentStep];

    switch (currentStepName) {
      case 'timeFrame':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">1단계: 여행 기간 설정</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Input
                  label="몇 박"
                  type="number"
                  value={formState.nights.toString()}
                  onChange={(e) => {
                    const nights = parseInt(e.target.value) || 0;
                    handleUpdateForm('nights', nights);
                    handleUpdateForm('days', nights + 1);
                  }}
                  min="0"
                  max="10"
                />
                <Input
                  label="몇 일"
                  type="number"
                  value={formState.days.toString()}
                  onChange={(e) => {
                    const days = parseInt(e.target.value) || 0;
                    handleUpdateForm('days', days);
                    handleUpdateForm('nights', days - 1);
                  }}
                  min="1"
                  max="11"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">도착 시간</label>
                  <div className="flex space-x-2">
                    <Select
                      label="시"
                      value={formState.arrivalHour}
                      onChange={(e) => handleUpdateForm('arrivalHour', e.target.value)}
                      options={HOUR_OPTIONS}
                    />
                    <Select
                      label="분"
                      value={formState.arrivalMinute}
                      onChange={(e) => handleUpdateForm('arrivalMinute', e.target.value)}
                      options={MINUTE_OPTIONS}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">출발 시간</label>
                  <div className="flex space-x-2">
                    <Select
                      label="시"
                      value={formState.departureHour}
                      onChange={(e) => handleUpdateForm('departureHour', e.target.value)}
                      options={HOUR_OPTIONS}
                    />
                    <Select
                      label="분"
                      value={formState.departureMinute}
                      onChange={(e) => handleUpdateForm('departureMinute', e.target.value)}
                      options={MINUTE_OPTIONS}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  총 여행시간: <strong>{calculateTotalHours().toFixed(1)}시간</strong>
                </p>
              </div>
            </div>
          </div>
        );

      case 'fixedPoints':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">2단계: 고정 일정 설정</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">숙소 예약 상태</label>
                  <div className="space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="booked"
                        checked={formState.accommodationStatus === 'booked'}
                        onChange={(e) => handleUpdateForm('accommodationStatus', e.target.value as 'booked' | 'not_booked')}
                        className="form-radio"
                      />
                      <span className="ml-2">예약완료</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="not_booked"
                        checked={formState.accommodationStatus === 'not_booked'}
                        onChange={(e) => handleUpdateForm('accommodationStatus', e.target.value as 'booked' | 'not_booked')}
                        className="form-radio"
                      />
                      <span className="ml-2">미예약</span>
                    </label>
                  </div>
                </div>

                {formState.accommodationStatus === 'booked' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">예약된 숙소</label>
                      <Button
                        onClick={() => setAccommodationModalOpen(true)}
                        size="small"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        🗺️ 숙소 추가
                      </Button>
                    </div>

                    {formState.fixedAccommodations.length > 0 && (
                      <div className="space-y-2">
                        {formState.fixedAccommodations.map((accommodation, index) => (
                          <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{accommodation.name}</p>
                                <p className="text-sm text-gray-600">{accommodation.address}</p>
                                <p className="text-xs text-gray-500">
                                  GPS: {accommodation.lat.toFixed(4)}, {accommodation.lng.toFixed(4)}
                                </p>
                              </div>
                              <Button
                                onClick={() => {
                                  const updated = formState.fixedAccommodations.filter((_, i) => i !== index);
                                  handleUpdateForm('fixedAccommodations', updated);
                                }}
                                variant="secondary"
                                size="small"
                                className="text-red-600 hover:text-red-800"
                              >
                                삭제
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {formState.fixedAccommodations.length === 0 && (
                      <p className="text-sm text-gray-500 italic">구글맵에서 정확한 숙소 위치를 검색해 추가해주세요</p>
                    )}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">필수 방문 관광지</label>
                    <Button
                      onClick={() => setAttractionModalOpen(true)}
                      size="small"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      🗺️ 관광지 추가
                    </Button>
                  </div>

                  {formState.fixedAttractions.length > 0 && (
                    <div className="space-y-2">
                      {formState.fixedAttractions.map((attraction, index) => (
                        <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{attraction.name}</p>
                              <p className="text-sm text-gray-600">{attraction.address}</p>
                              <p className="text-xs text-gray-500">
                                GPS: {attraction.lat.toFixed(4)}, {attraction.lng.toFixed(4)}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                const updated = formState.fixedAttractions.filter((_, i) => i !== index);
                                handleUpdateForm('fixedAttractions', updated);
                              }}
                              variant="secondary"
                              size="small"
                              className="text-red-600 hover:text-red-800"
                            >
                              삭제
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">필수 방문 맛집</label>
                    <Button
                      onClick={() => setRestaurantModalOpen(true)}
                      size="small"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      🗺️ 맛집 추가
                    </Button>
                  </div>

                  {formState.fixedRestaurants.length > 0 && (
                    <div className="space-y-2">
                      {formState.fixedRestaurants.map((restaurant, index) => (
                        <div key={index} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{restaurant.name}</p>
                              <p className="text-sm text-gray-600">{restaurant.address}</p>
                              <p className="text-xs text-gray-500">
                                GPS: {restaurant.lat.toFixed(4)}, {restaurant.lng.toFixed(4)}
                              </p>
                            </div>
                            <Button
                              onClick={() => {
                                const updated = formState.fixedRestaurants.filter((_, i) => i !== index);
                                handleUpdateForm('fixedRestaurants', updated);
                              }}
                              variant="secondary"
                              size="small"
                              className="text-red-600 hover:text-red-800"
                            >
                              삭제
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">꼭 먹고싶은 음식</label>
                  <CheckboxGroup
                    options={MUST_TRY_FOODS}
                    selectedOptions={formState.mustTryFoods}
                    onChange={(food) => {
                      const updated = formState.mustTryFoods.includes(food)
                        ? formState.mustTryFoods.filter(f => f !== food)
                        : [...formState.mustTryFoods, food];
                      handleUpdateForm('mustTryFoods', updated);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'routeConstraints':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">3단계: 동선 제약조건</h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">저녁식사 이동 허용시간</label>
                  <div className="space-y-2">
                    {DINNER_TRAVEL_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          value={option.value}
                          checked={formState.dinnerTravelTime === option.value}
                          onChange={(e) => handleUpdateForm('dinnerTravelTime', e.target.value as any)}
                          className="form-radio"
                        />
                        <span className="ml-2">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">숙소 이동 고려사항</label>
                  <div className="space-y-2">
                    {NEXT_DAY_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          value={option.value}
                          checked={formState.nextDayConsideration === option.value}
                          onChange={(e) => handleUpdateForm('nextDayConsideration', e.target.value as any)}
                          className="form-radio"
                        />
                        <span className="ml-2">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formState.postLunchCafe}
                      onChange={(e) => handleUpdateForm('postLunchCafe', e.target.checked)}
                      className="form-checkbox"
                    />
                    <span className="ml-2">점심식사 후 카페 필수 포함</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">제주 특성상 카페가 관광지 역할을 하므로 권장합니다</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">4단계: 개인 선호도</h3>

              <div className="space-y-6">
                <div>
                  <CheckboxGroup
                    label="동행자"
                    options={COMPANION_OPTIONS}
                    selectedOptions={formState.companions}
                    onChange={(companion) => {
                      const updated = formState.companions.includes(companion)
                        ? formState.companions.filter(c => c !== companion)
                        : [...formState.companions, companion];
                      handleUpdateForm('companions', updated);
                    }}
                  />
                </div>

                <Select
                  label="교통수단"
                  value={formState.transportation}
                  onChange={(e) => handleUpdateForm('transportation', e.target.value)}
                  options={TRANSPORTATION_OPTIONS}
                />

                <Select
                  label="여행 페이스"
                  value={formState.pace}
                  onChange={(e) => handleUpdateForm('pace', e.target.value)}
                  options={PACE_OPTIONS}
                />

                <div>
                  <CheckboxGroup
                    label="관심사"
                    options={INTEREST_OPTIONS}
                    selectedOptions={formState.interests}
                    onChange={(interest) => {
                      const updated = formState.interests.includes(interest)
                        ? formState.interests.filter(i => i !== interest)
                        : [...formState.interests, interest];
                      handleUpdateForm('interests', updated);

                      // Initialize weights for new interests
                      if (!formState.interests.includes(interest)) {
                        const newWeights = { ...formState.interestWeights };
                        const avgWeight = Math.round(100 / (updated.length || 1) / 10) * 10;
                        updated.forEach(int => {
                          if (!newWeights[int]) newWeights[int] = avgWeight;
                        });
                        handleUpdateForm('interestWeights', newWeights);
                      }
                    }}
                  />
                </div>

                {formState.interests.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">관심사 비중 조절</label>
                    {formState.interests.map((interest) => (
                      <div key={interest} className="mb-4">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-600">{interest}</span>
                          <span className="text-sm font-medium">{formState.interestWeights[interest] || 0}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={formState.interestWeights[interest] || 0}
                          onChange={(e) => handleWeightChange(interest, parseInt(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <Select
                  label="여행 스타일"
                  value={formState.tripStyle}
                  onChange={(e) => handleUpdateForm('tripStyle', e.target.value)}
                  options={TRIP_STYLE_OPTIONS}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        {!finalItinerary && !isLoading && (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">🤖 여행일정 AI</h2>
                <div className="text-sm text-gray-500">
                  {currentStep + 1} / {STEPS.length}
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {renderCurrentStep()}

            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                variant="secondary"
              >
                이전
              </Button>

              <Button
                onClick={handleNext}
              >
                {currentStep === STEPS.length - 1 ? '일정 생성하기' : '다음'}
              </Button>
            </div>
          </>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>

              <div className="absolute inset-2 flex items-center justify-center">
                <span className="text-2xl animate-pulse">🧠</span>
              </div>

              <div className="absolute -inset-3 opacity-20">
                <div className="w-full h-full border-2 border-blue-300 rounded-full animate-ping"></div>
              </div>

              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute w-8 h-8 text-xl animate-spin"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 90}deg) translateY(-40px)`,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: '2s'
                  }}
                >
                  {['✈️', '🏖️', '🍴', '🏨'][i]}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  AI가 맞춤 여행일정을 생성중입니다
                </span>
              </h3>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full animate-pulse"></div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <p className="animate-pulse">🔍 최적 동선을 계산하고 있어요</p>
                <p className="animate-pulse" style={{ animationDelay: '0.5s' }}>🗺️ 맞춤 스팟을 선별하고 있어요</p>
                <p className="animate-pulse" style={{ animationDelay: '1s' }}>⏰ 시간표를 조정하고 있어요</p>
              </div>
            </div>
          </div>
        )}

        {finalItinerary && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-2">
                <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ✨ 맞춤 여행일정이 완성되었어요!
                </span>
              </h3>
              <p className="text-gray-600">아래 일정을 참고해서 즐거운 제주여행 되세요 🌺</p>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
              <FormattedMessageContent content={finalItinerary} />
            </div>

            <div className="flex justify-center space-x-4 pt-4 border-t">
              <Button onClick={resetState} variant="secondary">
                새로 만들기
              </Button>
              <Button onClick={onClose}>
                완료
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">오류: {error}</p>
            <Button onClick={() => setError(null)} variant="secondary" className="mt-2">
              다시 시도
            </Button>
          </div>
        )}

        <div ref={messagesEndRef} />

        {/* SpotSearchModal들 */}
        <SpotSearchModal
          isOpen={accommodationModalOpen}
          onClose={() => setAccommodationModalOpen(false)}
          type="accommodation"
          onComplete={handleAccommodationComplete}
        />

        <SpotSearchModal
          isOpen={restaurantModalOpen}
          onClose={() => setRestaurantModalOpen(false)}
          type="restaurant"
          onComplete={handleRestaurantComplete}
        />

        <SpotSearchModal
          isOpen={attractionModalOpen}
          onClose={() => setAttractionModalOpen(false)}
          type="attraction"
          onComplete={handleAttractionComplete}
        />
      </div>
    </Modal>
  );
};

export default TripPlannerModal;