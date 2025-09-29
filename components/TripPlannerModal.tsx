import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import type { Place, FixedSpot, OroomData } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';
import Input from './common/Input';
import Select from './common/Select';
import CheckboxGroup from './common/CheckboxGroup';
import SpotSearchModal from './SpotSearchModal';
import { ACCOMMODATION_TYPE_OPTIONS, ACCOMMODATION_PRICE_RANGE_OPTIONS } from '../constants';

// The API key is sourced from the environment variable `process.env.API_KEY`.
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

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
  wantAccommodationRecommendation: boolean;
  recommendationPreferences: {
    priceRange: string;
    accommodationType: string;
    region: string;
    viewType: string;
  };
  fixedAccommodations: FixedSpot[];
  fixedAttractions: FixedSpot[];
  fixedRestaurants: FixedSpot[];
  mustTryFoods: string[];

  // Step 3: Route Constraints
  nextDayConsideration: 'same_day_finish' | 'next_day_start';
  dinnerStrategy: 'near_accommodation' | 'near_last_spot'; // only when next_day_start
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
  accommodationStatus: 'booked', // 기본값을 'booked'로 변경 (정해진 숙소 있음)
  wantAccommodationRecommendation: false,
  recommendationPreferences: {
    priceRange: '10만원 전후',
    accommodationType: '호텔',
    region: '제주시',
    viewType: '바다뷰',
  },
  fixedAccommodations: [],
  fixedAttractions: [],
  fixedRestaurants: [],
  mustTryFoods: [],

  // Step 3: Route Constraints
  nextDayConsideration: 'same_day_finish',
  dinnerStrategy: 'near_last_spot',
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

// Step 3 Options - removed, now inline in component

// Step 2 Options
const ACCOMMODATION_REGIONS = [
  "성산구좌(제주동쪽)", "표선남원(제주동남쪽)", "서귀포시중문(서귀포시)",
  "대정안덕(제주남서쪽)", "한림한경(제주서쪽)", "애월(제주시의서쪽)",
  "제주시", "조천(제주시의동쪽)"
];
const ACCOMMODATION_VIEW_TYPES = ["바다뷰", "먼바다뷰", "중산간"];

// Step 4 Options
const COMPANION_OPTIONS = ["혼자", "친구와", "연인과", "아이를 동반한 가족", "부모님을 모시고", "반려견과 함께", "회사 동료와"];
const TRANSPORTATION_OPTIONS = ["렌터카", "대중교통", "택시/투어 상품 이용"];
const PACE_OPTIONS = ["여유롭게", "보통", "촘촘하게"];
const INTEREST_OPTIONS = ["#자연 (숲, 오름, 바다)", "#오션뷰 (카페, 식당, 숙소)", "#요즘 뜨는 핫플", "#쇼핑 & 소품샵", "#박물관 & 미술관", "#역사 & 문화 유적", "#짜릿한 액티비티", "#걷기 좋은 길", "#히든플레이스 (숨은 명소)"];
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
  orooms: OroomData[];
}

const TripPlannerModal: React.FC<TripPlannerModalProps> = ({ isOpen, onClose, spots, orooms }) => {
  const [formState, setFormState] = useState<TripPlanFormState>(initialFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [finalItinerary, setFinalItinerary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // SpotSearchModal 상태들
  const [accommodationModalOpen, setAccommodationModalOpen] = useState(false);
  const [restaurantModalOpen, setRestaurantModalOpen] = useState(false);
  const [attractionModalOpen, setAttractionModalOpen] = useState(false);

  const STEPS = ['timeFrame', 'fixedPoints', 'routeConstraints', 'preferences'];

  const resetState = () => {
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

    setIsLoading(true);
    setError(null);

    try {
      const totalHours = calculateTotalHours();
      const spotData = JSON.stringify(spots, null, 2);
      const oroomData = JSON.stringify(orooms, null, 2);

      const prompt = `
다음 정보를 바탕으로 제주도 여행 일정을 작성해주세요:

## 🕐 여행 기간 정보
- ${formState.nights}박 ${formState.days}일
- 도착시간: ${formState.arrivalHour}:${formState.arrivalMinute}
- 출발시간: ${formState.departureHour}:${formState.departureMinute}
- 총 여행시간: 약 ${totalHours.toFixed(1)}시간

## 🏨 고정 일정 (최우선 반영)
- 숙소 상태: ${formState.accommodationStatus === 'booked' ? '정해진 숙소 있음' : '정해진 숙소 없음'}
${formState.accommodationStatus === 'booked' && formState.fixedAccommodations.length > 0 ?
  `- 예약된 숙소:\n${formState.fixedAccommodations.map(acc =>
    `  * ${acc.name} (${acc.address}) - GPS: ${acc.lat}, ${acc.lng}`).join('\n')}
- ⚠️ 숙소 체크인 시간: 일반적으로 15:00 (각 숙소 public_info 확인 필요)` :
  formState.accommodationStatus === 'not_booked' && formState.wantAccommodationRecommendation ?
    `- 숙소 추천 요청: ${formState.wantAccommodationRecommendation ? '예' : '아니오'}
- 선호 가격대: ${formState.recommendationPreferences.priceRange}
- 선호 숙소 유형: ${formState.recommendationPreferences.accommodationType}
- 선호 권역: ${formState.recommendationPreferences.region}
- 선호 뷰 유형: ${formState.recommendationPreferences.viewType}
- ⚠️ 숙소 체크인 시간: 일반적으로 15:00 (추천 숙소의 accommodation_info.check_in_time 확인)` :
    '- ⚠️ 숙소 체크인 시간: 일반적으로 15:00 (숙소 선택 시 확인 필요)'}
${formState.fixedAttractions.length > 0 ?
  `- 필수 방문 관광지:\n${formState.fixedAttractions.map(att =>
    `  * ${att.name} (${att.address}) - GPS: ${att.lat}, ${att.lng}`).join('\n')}` : '- 필수 방문 관광지: 없음'}
${formState.fixedRestaurants.length > 0 ?
  `- 필수 방문 맛집:\n${formState.fixedRestaurants.map(rest =>
    `  * ${rest.name} (${rest.address}) - GPS: ${rest.lat}, ${rest.lng}`).join('\n')}` : '- 필수 방문 맛집: 없음'}
- 꼭 먹고싶은 음식: ${formState.mustTryFoods.join(', ') || '없음'}

## 🛣️ 동선 제약조건 (중요)
- 숙소 배치 전략: ${formState.nextDayConsideration === 'same_day_finish' ? '당일 마무리 중시' : '다음날 시작 중시'}${formState.nextDayConsideration === 'next_day_start' ? ` (저녁식사: ${formState.dinnerStrategy === 'near_accommodation' ? '숙소 근처' : '마지막 관광지 근처'})` : ''}
- 점심 후 카페 포함: ${formState.postLunchCafe ? '필수' : '선택'}

## 👥 여행 선호도
- 동행자: ${formState.companions.join(', ') || '없음'}
- 교통수단: ${formState.transportation} ${formState.transportation === '렌터카' ? '(짐 보관 가능, 숙소 방향 이동 우선)' : ''}
- 여행 페이스: ${formState.pace}
- 관심사: ${formState.interests.join(', ') || '없음'}
- 여행 스타일: ${formState.tripStyle}

## 📋 일정 작성 규칙
1. **숙소를 중심으로 한 효율적 동선 설계**
2. **숙소 체크인 시간 고려 (매우 중요)**:
   - 숙소 체크인은 일반적으로 15:00 이후 가능 (각 숙소 public_info에서 확인)
   - ⚠️ 동선 효율성을 우선하고, 체크인은 자연스럽게 배치:
     * 숙소가 관광 경로 중간에 위치 → 15:00 이후 편리한 시점에 체크인
     * 숙소가 관광 경로 끝에 위치 → 저녁식사 후 마지막에 체크인
   - 첫날: 도착 후 숙소 방향으로 이동하며 효율적인 동선 구성 (렌터카 짐 보관)
   - 마지막날: 체크아웃 시간(일반적으로 11:00) 고려하여 출발 전 마무리
3. **점심 후 ${formState.postLunchCafe ? '반드시' : '가능하면'} 카페 포함**
4. **저녁식사 배치 규칙**:
   ${formState.nextDayConsideration === 'same_day_finish'
     ? '- 마지막 관광지, 저녁식사, 숙소를 모두 30분 내외로 배치'
     : formState.dinnerStrategy === 'near_accommodation'
       ? '- 숙소 근처에서 저녁식사 (다음날 동선 최적화)'
       : '- 마지막 관광지 근처에서 저녁식사 후 숙소로 이동'
   }
5. **관심사 기반 스팟 선택 (매우 중요)**:
   ${Object.entries(formState.interestWeights).map(([interest, weight]) =>
     `- ${interest}: ${weight}% 비중으로 우선 선택`
   ).join('\n   ')}

   **각 관심사별 스팟 매칭 기준**:
   - **자연**: interest_tags에 "자연" 포함 또는 view_info에서 nature_view/mountain_view true
   - **오션뷰**: interest_tags에 "오션뷰" 포함 또는 view_info에서 ocean_view true
   - **요즘 뜨는 핫플**: interest_tags에 "요즘핫플" 포함 또는 trend_info에서 trend_status "요즘핫플"
   - **쇼핑 & 소품샵**: interest_tags에 "쇼핑" 포함 또는 shopping_info 데이터 존재
   - **박물관 & 미술관**: interest_tags에 "박물관" 포함 또는 categories에 박물관/미술관 포함
   - **역사 & 문화 유적**: interest_tags에 "역사" 포함 또는 cultural_info에서 historical_significance true
   - **짜릿한 액티비티**: interest_tags에 "액티비티" 포함 또는 activity_info에서 activity_level "활동적"/"매우활동적"
   - **걷기 좋은 길**: interest_tags에 "걷기" 포함 또는 activity_info에서 walking_required true
6. **숙소 선택 기준 (중요)**:
   - **숙소 스팟 활용**: categories에 "숙소" 포함된 스팟들만 숙소로 추천
   - **숙소 추천 요청 처리**:
     ${formState.accommodationStatus === 'not_booked' && formState.wantAccommodationRecommendation ?
       `* 사용자가 숙소 추천을 요청했습니다 → 적절한 숙소를 1-2곳 추천해주세요
     * 가격대 필터링: accommodation_info.price_range = "${formState.recommendationPreferences.priceRange}" 우선
     * 숙소 유형 필터링: accommodation_info.accommodation_type = "${formState.recommendationPreferences.accommodationType}" 우선
     * 권역 필터링: accommodation_info.region = "${formState.recommendationPreferences.region}" 우선
     * 뷰 유형 필터링: accommodation_info.view_type = "${formState.recommendationPreferences.viewType}" 우선` :
       formState.accommodationStatus === 'booked' ?
         `* 사용자가 이미 숙소를 정해두었습니다 → 추가 숙소 추천 불필요` :
         `* 사용자가 숙소 추천을 원하지 않습니다 → 숙소 없이 일정만 작성`}
   - **가격대 매칭**: 사용자 여행 스타일에 따라 accommodation_info.price_range 고려
     * "전체 저예산 위주" → "5만원 전후" 우선
     * "중간 (적당히 절약 + 포인트 투자)" → "5만원 전후", "10만원 전후" 균형
     * "고급 (숙소·식사·체험 모두 고급 위주)" → "10만원 전후", "20만원 이상" 우선
   - **동행자 고려**: accommodation_info.kid_friendly, pet_friendly 활용
   - **체크인 시간**: accommodation_info.check_in_time, check_out_time 정확히 반영
7. **페이스에 따른 체류시간 조절**:
   - 여유롭게: 기본 시간 + 30%
   - 보통: 기본 시간
   - 촉촘하게: 기본 시간 - 20%, 더 많은 스팟

## 📍 이용 가능한 데이터

### 1. 여행 스팟 데이터 (카페, 식당, 관광지, 숙소 등)
${spotData}

### 2. 오름 데이터 (제주 화산체 정보)
${oroomData}

**⚠️ 중요: 위 데이터에 포함된 장소들만 사용해서 일정을 작성해주세요.**
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text = response.text;

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
                      <span className="ml-2">정해진 숙소 있음</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        value="not_booked"
                        checked={formState.accommodationStatus === 'not_booked'}
                        onChange={(e) => {
                          handleUpdateForm('accommodationStatus', e.target.value as 'booked' | 'not_booked');
                          handleUpdateForm('wantAccommodationRecommendation', false);
                        }}
                        className="form-radio"
                      />
                      <span className="ml-2">정해진 숙소 없음</span>
                    </label>
                  </div>
                </div>

                {formState.accommodationStatus === 'not_booked' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">숙소 추천해 드릴까요?</label>
                      <div className="space-x-4">
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="yes"
                            checked={formState.wantAccommodationRecommendation === true}
                            onChange={() => handleUpdateForm('wantAccommodationRecommendation', true)}
                            className="form-radio"
                          />
                          <span className="ml-2">네, 추천해 주세요</span>
                        </label>
                        <label className="inline-flex items-center">
                          <input
                            type="radio"
                            value="no"
                            checked={formState.wantAccommodationRecommendation === false}
                            onChange={() => handleUpdateForm('wantAccommodationRecommendation', false)}
                            className="form-radio"
                          />
                          <span className="ml-2">아니요, 괜찮습니다</span>
                        </label>
                      </div>
                    </div>

                    {formState.wantAccommodationRecommendation && (
                      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-800">숙소 추천 설정</h4>

                        <div className="grid grid-cols-2 gap-4">
                          <Select
                            label="가격대 (1박 기준)"
                            value={formState.recommendationPreferences.priceRange}
                            onChange={(e) => handleUpdateForm('recommendationPreferences', {
                              ...formState.recommendationPreferences,
                              priceRange: e.target.value
                            })}
                            options={ACCOMMODATION_PRICE_RANGE_OPTIONS}
                          />
                          <Select
                            label="숙소 유형"
                            value={formState.recommendationPreferences.accommodationType}
                            onChange={(e) => handleUpdateForm('recommendationPreferences', {
                              ...formState.recommendationPreferences,
                              accommodationType: e.target.value
                            })}
                            options={ACCOMMODATION_TYPE_OPTIONS}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <Select
                            label="선호 권역"
                            value={formState.recommendationPreferences.region}
                            onChange={(e) => handleUpdateForm('recommendationPreferences', {
                              ...formState.recommendationPreferences,
                              region: e.target.value
                            })}
                            options={ACCOMMODATION_REGIONS}
                          />
                          <Select
                            label="뷰 유형"
                            value={formState.recommendationPreferences.viewType}
                            onChange={(e) => handleUpdateForm('recommendationPreferences', {
                              ...formState.recommendationPreferences,
                              viewType: e.target.value
                            })}
                            options={ACCOMMODATION_VIEW_TYPES}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                  <label className="block text-sm font-medium text-gray-700 mb-3">숙소 이동 고려사항</label>
                  <div className="space-y-3">
                    <label className="flex items-start">
                      <input
                        type="radio"
                        value="same_day_finish"
                        checked={formState.nextDayConsideration === 'same_day_finish'}
                        onChange={(e) => handleUpdateForm('nextDayConsideration', e.target.value as any)}
                        className="form-radio mt-1"
                      />
                      <div className="ml-2">
                        <span className="font-medium">당일 동선 중시</span>
                        <p className="text-sm text-gray-600 mt-1">마지막 관광지, 저녁식사, 숙소를 모두 30분 내외로 배치하여 편안한 마무리</p>
                      </div>
                    </label>

                    <label className="flex items-start">
                      <input
                        type="radio"
                        value="next_day_start"
                        checked={formState.nextDayConsideration === 'next_day_start'}
                        onChange={(e) => handleUpdateForm('nextDayConsideration', e.target.value as any)}
                        className="form-radio mt-1"
                      />
                      <div className="ml-2">
                        <span className="font-medium">다음날 시작 중시</span>
                        <p className="text-sm text-gray-600 mt-1">다음날 첫 관광지 근처에 숙소 배치 (저녁식사 위치 선택 가능)</p>
                      </div>
                    </label>
                  </div>

                  {formState.nextDayConsideration === 'next_day_start' && (
                    <div className="mt-4 ml-6 space-y-2 border-l-2 border-blue-200 pl-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">저녁식사 위치 선택:</p>
                      <label className="flex items-start">
                        <input
                          type="radio"
                          value="near_accommodation"
                          checked={formState.dinnerStrategy === 'near_accommodation'}
                          onChange={(e) => handleUpdateForm('dinnerStrategy', e.target.value as any)}
                          className="form-radio mt-1"
                        />
                        <div className="ml-2">
                          <span className="text-sm">숙소 근처에서 저녁식사</span>
                          <p className="text-xs text-gray-500">마지막 관광지 → (이동) → 숙소 근처 저녁식사</p>
                        </div>
                      </label>

                      <label className="flex items-start">
                        <input
                          type="radio"
                          value="near_last_spot"
                          checked={formState.dinnerStrategy === 'near_last_spot'}
                          onChange={(e) => handleUpdateForm('dinnerStrategy', e.target.value as any)}
                          className="form-radio mt-1"
                        />
                        <div className="ml-2">
                          <span className="text-sm">마지막 관광지 근처에서 저녁식사</span>
                          <p className="text-xs text-gray-500">마지막 관광지 → 근처 저녁식사 → (이동) → 숙소 🍻</p>
                        </div>
                      </label>
                    </div>
                  )}
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
                        const avgWeight = Math.round(100 / updated.length / 10) * 10;

                        // Reset all weights to ensure 100% total
                        updated.forEach(int => {
                          newWeights[int] = avgWeight;
                        });

                        // Clean up weights for removed interests
                        Object.keys(newWeights).forEach(key => {
                          if (!updated.includes(key)) {
                            delete newWeights[key];
                          }
                        });

                        handleUpdateForm('interestWeights', newWeights);
                      } else {
                        // When removing an interest, redistribute weights
                        const newWeights = { ...formState.interestWeights };
                        const removedWeight = newWeights[interest] || 0;
                        delete newWeights[interest];

                        if (updated.length > 0) {
                          const redistribution = Math.round(removedWeight / updated.length / 10) * 10;
                          updated.forEach(int => {
                            newWeights[int] = (newWeights[int] || 0) + redistribution;
                          });
                        }

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
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">총 비중</span>
                        <span className={`text-sm font-medium ${
                          Object.values(formState.interestWeights).reduce((sum, weight) => sum + (weight || 0), 0) === 100
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {Object.values(formState.interestWeights).reduce((sum, weight) => sum + (weight || 0), 0)}%
                        </span>
                      </div>
                    </div>
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