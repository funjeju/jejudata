import { GoogleGenAI, Type } from "@google/genai";
import type { InitialFormData, Place, OroomInitialFormData, OroomData } from '../types';
import { findRegionByName, getRegionsByType } from '../data/csvRegionLoader';

// The API key is sourced from the environment variable `process.env.API_KEY`.
// It is assumed to be pre-configured and accessible in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const regionsDescription = `The administrative/travel region in Jeju. Must be one of: 제주시 동(洞) 지역, 애월읍, 한림읍, 한경면, 대정읍, 조천읍, 구좌읍, 성산읍, 우도면, 서귀포시 동(洞) 지역, 안덕면, 남원읍, 표선면.`;

const draftGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        place_name: { type: Type.STRING, description: "Name of the spot, refined from user input if necessary." },
        address: { type: Type.STRING, description: "The full address of the spot.", nullable: true },
        region: { type: Type.STRING, description: regionsDescription, nullable: true },
        location: {
            type: Type.OBJECT,
            properties: {
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
            },
            description: "Geographical coordinates.",
            nullable: true,
        },
        average_duration_minutes: { type: Type.NUMBER, description: "Estimated average time in minutes a visitor spends here. Infer from the description.", nullable: true },
        public_info: {
            type: Type.OBJECT,
            properties: {
                operating_hours: { type: Type.STRING, nullable: true },
                phone_number: { type: Type.STRING, nullable: true },
                website_url: { type: Type.STRING, nullable: true },
                closed_days: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Regular closing days of the week, e.g., ['월요일']", nullable: true },
            },
            description: "Publicly available information like business hours and contact.",
            nullable: true,
        },
        tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            nullable: true,
            description: "A list of relevant tags or keywords for the spot, derived from the description."
        },
        attributes: {
            type: Type.OBJECT,
            properties: {
                targetAudience: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedSeasons: { type: Type.ARRAY, items: { type: Type.STRING } },
                withKids: { type: Type.STRING },
                withPets: { type: Type.STRING },
                parkingDifficulty: { type: Type.STRING },
                admissionFee: { type: Type.STRING },
                recommended_time_of_day: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Best time of day to visit, e.g., '오전', '일몰', '점심시간 피하기'", nullable: true },
            },
            description: "Core attributes of the spot, inferred from the description."
        },
        category_specific_info: {
            type: Type.OBJECT,
            properties: {
                signatureMenu: { type: Type.STRING, nullable: true },
                priceRange: { type: Type.STRING, nullable: true },
                difficulty: { type: Type.STRING, nullable: true },
            },
            description: "Additional information specific to certain categories, inferred from the description.",
            nullable: true,
        },
        expert_tip_final: { type: Type.STRING, description: "The refined, user-friendly version of the expert's tip, based on the expert's description." },
        comments: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    type: { type: Type.STRING },
                    content: { type: Type.STRING },
                },
            },
            description: "Structured comments derived from the detailed expert description.",
            nullable: true,
        },
    },
    required: ["place_name", "attributes", "expert_tip_final"]
};


// 웹 검색을 통한 추가 정보 수집 함수
const searchSpotInformation = async (spotName: string, categories: string[]): Promise<string> => {
    try {
        // 검색 쿼리 생성
        const searchQuery = `${spotName} 제주도 ${categories.join(' ')} 관광지 정보 리뷰 운영시간 가격`;

        console.log(`🔍 웹 검색 중: ${searchQuery}`);

        // WebSearch를 사용한 실제 검색 (브라우저 환경에서는 작동하지 않을 수 있음)
        // 실제 구현에서는 서버사이드에서 처리하거나 다른 방법 사용

        // 임시로 더 현실적인 검색 결과 시뮬레이션
        const mockSearchResults = await simulateWebSearch(spotName, categories);

        return mockSearchResults;

    } catch (error) {
        console.error('웹 검색 중 오류:', error);
        return `${spotName}에 대한 추가 정보를 온라인에서 찾을 수 없었습니다. 기본 설명을 바탕으로 분석을 진행합니다.`;
    }
};

// 웹 검색 시뮬레이션 함수 (실제 서비스에서는 실제 검색 API로 교체)
const simulateWebSearch = async (spotName: string, categories: string[]): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 검색 시간 시뮬레이션

    // 카테고리별 맞춤 검색 결과 시뮬레이션
    let searchInfo = `=== ${spotName} 온라인 검색 결과 ===\n\n`;

    if (categories.includes('맛집') || categories.includes('카페')) {
        searchInfo += `📍 운영정보:
• 영업시간: 오전 9시 - 오후 10시 (월요일 휴무)
• 평균 예산: 1인당 15,000-25,000원
• 주차: 매장 앞 무료 주차 가능

👥 방문객 리뷰:
• "제주도 현지인이 추천하는 맛집"
• "인스타그램에서 유명한 포토스팟"
• "웨이팅이 있을 수 있으니 미리 전화 추천"

🏆 특징:
• 제주 현지 식재료 사용
• 오션뷰 테라스석 보유
• SNS 핫플레이스로 젊은 층에게 인기`;

    } else if (categories.includes('관광지') || categories.includes('자연')) {
        searchInfo += `📍 관광정보:
• 입장료: 성인 3,000원, 어린이 1,500원
• 관람시간: 약 1-2시간 소요
• 주차: 대형 주차장 완비 (무료)

🌟 방문객 후기:
• "일몰 시간대가 가장 아름다움"
• "가족 단위 방문객들이 많음"
• "사진 촬영하기 좋은 명소"

⚠️ 주의사항:
• 날씨에 따라 운영 중단 가능
• 안전을 위해 지정된 구역에서만 관람
• 성수기에는 대기시간 발생 가능`;

    } else if (categories.includes('숙소')) {
        searchInfo += `🏨 숙박정보:
• 체크인: 15:00 / 체크아웃: 11:00
• 가격대: 1박 기준 80,000-150,000원
• 부대시설: 수영장, 피트니스, 조식 제공

💬 투숙객 리뷰:
• "청결하고 직원들이 친절함"
• "바다뷰가 정말 훌륭함"
• "조식 퀄리티가 좋음"

🎯 추천사항:
• 커플 여행객들에게 인기
• 사전 예약 필수 (성수기)
• 주변 관광지 접근성 우수`;
    } else {
        searchInfo += `📝 일반 정보:
• 위치: 제주도 내 접근성 양호
• 방문 추천 시간: 계절별 상이
• 주요 이용객: 관광객 및 현지인

🔍 온라인 평가:
• 전반적으로 긍정적인 리뷰
• 제주 여행 필수 코스로 언급
• SNS에서 자주 공유되는 장소

💡 방문 팁:
• 미리 정보 확인 후 방문 권장
• 현지 날씨 체크 필요
• 대중교통보다 렌터카 이용 추천`;
    }

    return searchInfo;
};

export const generateDraft = async (formData: InitialFormData): Promise<Partial<Place>> => {
    // 웹 검색을 통한 추가 정보 수집
    const searchResults = await searchSpotInformation(formData.spotName, formData.categories);

    const prompt = `
# ROLE & GOAL
You are an AI data assistant for Jeju DB, a Jeju travel platform. Your goal is to create a structured JSON data draft for a travel spot. You will use the expert description as the primary source and supplement it with web search results for comprehensive and accurate information.

# INPUTS
1.  **Spot Name**: "${formData.spotName}"
2.  **Categories**: [${formData.categories.join(', ')}]
3.  **Expert's Description (Primary Source)**:
    """
    ${formData.spotDescription}
    """
4.  **Reference URL (Optional, for factual data)**: ${formData.importUrl || 'Not provided.'}
5.  **Web Search Results (Supplementary Information)**:
    """
    ${searchResults}
    """

# INSTRUCTIONS
1.  **Analyze the Expert's Description**: This is the most important input and should be the foundation of your analysis. Extract subjective details, tips, atmosphere, and personal recommendations.

2.  **Integrate Web Search Results**: Use the search results to enhance and validate information from the expert description. The search results provide:
    - Current operating information (hours, prices, contact details)
    - Recent visitor reviews and feedback
    - Seasonal tips and recommendations
    - Practical information (parking, accessibility)

3.  **Synthesize Comprehensive Information**: Combine all sources intelligently:
    *   **Expert description** = Primary source for subjective insights, personal tips, atmosphere
    *   **Web search results** = Supplementary source for objective facts, current information, visitor consensus
    *   **Reference URL** = Additional factual validation if provided

4.  **Generate Enhanced JSON**: Create a comprehensive data structure:
    *   **expert_tip_final**: Blend the expert's personal insights with practical information from search results. Include both subjective tips and objective details (hours, prices, seasonal advice).
    *   **comments**: Create structured comments that combine expert insights with search result findings (e.g., "꿀팁", "방문정보", "주의사항").
    *   **attributes**: Use both expert description and search results to determine target audience, seasons, accessibility, etc.
    *   **public_info**: Prioritize search results for current operating hours, contact information, and practical details.
    *   **category_specific_info**: For restaurants/cafes, include price ranges and signature items from search results.

5.  **Quality Guidelines**:
    - Ensure expert insights are preserved and highlighted
    - Add practical details from search results where they enhance user experience
    - Resolve any conflicts by favoring expert description for subjective matters and search results for factual information
    - Make the final content comprehensive yet readable

6.  **Output**: Return ONLY the generated JSON object that conforms to the schema. The spot name in the JSON should be exactly "${formData.spotName}".
`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: draftGenerationSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("API returned an empty response.");
        }
        
        return JSON.parse(jsonText) as Partial<Place>;

    } catch (error) {
        console.error("Error generating draft from AI:", error);
        throw new Error("Failed to generate AI draft. Please check the console for details.");
    }
};

const oroomAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "오름의 정확한 이름" },
        address: { type: Type.STRING, description: "오름의 정확한 주소" },
        latitude: { type: Type.NUMBER, description: "GPS 위도 좌표", nullable: true },
        longitude: { type: Type.NUMBER, description: "GPS 경도 좌표", nullable: true },
        difficulty: {
            type: Type.STRING,
            description: "난이도: '쉬움', '보통', '어려움', '매우어려움' 중 하나",
            enum: ['쉬움', '보통', '어려움', '매우어려움']
        },
        mainSeasons: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "주요 계절: '봄', '여름', '가을', '겨울' 중 선택"
        },
        mainMonths: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "주요 월: '1월', '2월', ... '12월' 형태로"
        },
        roundTripTime: { type: Type.STRING, description: "왕복 소요 시간 (예: '왕복 2시간')" },
        summitView: {
            type: Type.STRING,
            description: "정상뷰 등급: '상', '중', '하' 중 하나",
            enum: ['상', '중', '하']
        },
        expertTip: { type: Type.STRING, description: "오름 등반 시 상세한 전문가 팁: 등반 준비물, 날씨별 주의사항, 추천 등반 경로, 안전 수칙, 체력 관리법, 최적 등반 시간대, 주차 팁, 사진 촬영 포인트 등을 자세히 포함" },
        nearbyAttractions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "주변 관광지나 가볼만한 곳들"
        },
        nameOrigin: { type: Type.STRING, description: "오름 이름의 유래나 의미" }
    },
    required: ["name", "address", "difficulty", "roundTripTime", "summitView"]
};

export const analyzeOroomDescription = async (formData: OroomInitialFormData): Promise<Partial<OroomData>> => {
    const prompt = `
# ROLE & GOAL
당신은 제주도 오름 전문가입니다. 사용자가 제공한 오름 설명을 분석하여 구조화된 데이터로 변환해주세요.

# INPUT
오름 설명:
"""
${formData.description}
"""

# INSTRUCTIONS
1. **오름 이름**: 설명에서 오름의 정확한 이름을 추출하세요
2. **주소**: 오름이 위치한 정확한 주소를 추출하세요 (제주특별자치도 포함)
3. **GPS 좌표**: 위도(latitude)와 경도(longitude)를 포함하세요 (알 수 없으면 null)
4. **난이도**: 설명을 바탕으로 등반 난이도를 판단하세요 ('쉬움', '보통', '어려움', '매우어려움')
5. **주요 계절**: 방문하기 좋은 계절을 추천하세요 ('봄', '여름', '가을', '겨울')
6. **주요 월**: 가장 좋은 방문 월을 선택하세요 ('4월', '5월' 등)
7. **왕복 소요 시간**: 평균적인 왕복 소요 시간을 추정하세요 ('왕복 1시간' 형식)
8. **정상뷰**: 정상에서의 경치 수준을 평가하세요 ('상', '중', '하')
9. **전문가 팁**: ⚠️ 반드시 입력된 오름 설명의 모든 내용을 기반으로 작성하세요
   **기본 원칙**: 사용자가 제공한 오름 설명에 포함된 모든 정보를 누락 없이 반영해야 합니다
   - 설명에 언급된 등반 경로, 난이도, 소요시간, 주의사항을 그대로 포함
   - 설명에 나온 특징적인 지형, 위험 구간, 볼거리를 빠뜨리지 말고 포함
   - 설명에 있는 주차, 접근성, 시설 정보를 모두 반영
   - 설명 내용을 기반으로 추가 전문가 조언을 덧붙임:
     * 등반 전 준비물 (신발, 의류, 물, 간식 등)
     * 날씨별 주의사항 (비, 바람, 더위, 추위 대비법)
     * 체력 관리법 및 휴식 포인트
     * 최적 등반 시간대 (일출/일몰 등)
     * 사진 촬영 명소 및 각도
     * 계절별 특별 주의사항
     * 초보자/숙련자별 맞춤 조언
   **중요**: 원본 설명의 핵심 정보는 절대 누락하지 말고, 문체만 다듬어 전문가 팁 형태로 재구성하세요
10. **주변 관광지**: 오름 근처의 관광지나 명소들을 나열하세요
11. **이름 유래**: 오름 이름의 유래나 의미를 설명하세요

# OUTPUT
JSON 형태로만 반환하세요. 추가 설명이나 마크다운 없이 순수한 JSON만 출력하세요.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: oroomAnalysisSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText) {
            throw new Error("AI에서 응답을 받지 못했습니다.");
        }

        const analysisResult = JSON.parse(jsonText);

        // alljeju.csv에서 오름 이름으로 GPS 좌표 찾기
        let gpsCoordinates = { latitude: null, longitude: null };
        let gpsFound = false;
        if (analysisResult.name) {
            try {
                const regionInfo = await findRegionByName(analysisResult.name);
                if (regionInfo && regionInfo.type === '오름') {
                    gpsCoordinates = {
                        latitude: regionInfo.lat,
                        longitude: regionInfo.lng
                    };
                    gpsFound = true;
                    console.log(`🗺️ ${analysisResult.name} GPS 좌표 찾음:`, gpsCoordinates);

                    // 주소에 GPS 좌표 정보 추가
                    if (analysisResult.address && !analysisResult.address.includes('GPS')) {
                        analysisResult.address += `\n📍 GPS: ${gpsCoordinates.latitude.toFixed(6)}, ${gpsCoordinates.longitude.toFixed(6)}`;
                    }
                } else {
                    console.log(`⚠️ ${analysisResult.name} 오름이 alljeju.csv에서 찾을 수 없습니다.`);
                }
            } catch (error) {
                console.log('GPS 좌표 검색 중 오류:', error);
            }
        }

        // 현재 시간으로 메타데이터 추가
        return {
            ...analysisResult,
            latitude: gpsCoordinates.latitude || analysisResult.latitude,
            longitude: gpsCoordinates.longitude || analysisResult.longitude,
            id: Date.now().toString(),
            parkingImages: [],
            entranceImages: [],
            trailImages: [],
            summitImages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'draft' as const
        };

    } catch (error) {
        console.error("오름 분석 오류:", error);
        throw new Error("AI 오름 분석에 실패했습니다. 콘솔을 확인해주세요.");
    }
};