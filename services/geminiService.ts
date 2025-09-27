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


export const generateDraft = async (formData: InitialFormData): Promise<Partial<Place>> => {
    const prompt = `
# ROLE & GOAL
You are an AI data assistant for Jeju DB, a Jeju travel platform. Your goal is to create a structured JSON data draft for a travel spot. You will use a mandatory expert description as the primary source of truth, and an optional URL for supplementary, objective information.

# INPUTS
1.  **Spot Name**: "${formData.spotName}"
2.  **Categories**: [${formData.categories.join(', ')}]
3.  **Expert's Description (Primary Source)**:
    """
    ${formData.spotDescription}
    """
4.  **Reference URL (Optional, for factual data)**: ${formData.importUrl || 'Not provided.'}

# INSTRUCTIONS
1.  **Analyze the Expert's Description**: This is the most important input. Extract subjective details, tips, atmosphere, and recommendations. This should be the basis for 'expert_tip_final', 'comments', 'attributes' like target audience, and 'tags'.
2.  **Analyze the Reference URL (if provided)**: Use the URL to find objective, factual data like 'address', 'region', 'public_info' (operating hours, phone, website, closed days), and 'location' coordinates.
3.  **Synthesize and Generate JSON**: Combine information from both sources into a single JSON object.
    *   If there are conflicts, prioritize the URL for factual data (address, phone) and the expert description for subjective data (tips, audience).
    *   **expert_tip_final**: Create a polished, user-friendly tip based on the expert's description. It should be concise and helpful for a general audience.
    *   **comments**: Break down the expert's description into several structured comments (e.g., type: "꿀팁", content: "..."). Generate at least 2-3 comments if possible.
    *   **attributes**: Infer the attributes (targetAudience, recommendedSeasons, withKids, withPets, parkingDifficulty, admissionFee, recommended_time_of_day) from the description. Be comprehensive.
    *   **public_info**: Extract operating_hours, phone_number, website_url, and closed_days.
    *   **average_duration_minutes**: Infer the average stay time in minutes. For example, a quick photo spot might be 20 minutes, a cafe 60 minutes, and a major attraction or beach 120 minutes.
    *   **region**: Determine the region from the address. It must be one of: "제주시 동(洞) 지역", "애월읍", "한림읍", "한경면", "대정읍", "조천읍", "구좌읍", "성산읍", "우도면", "서귀포시 동(洞) 지역", "안덕면", "남원읍", "표선면".
4.  **Output**: Return ONLY the generated JSON object that conforms to the schema. Do not include any other text, explanation, or markdown formatting. The spot name in the JSON should be exactly "${formData.spotName}".
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
        expertTip: { type: Type.STRING, description: "오름 등반 시 전문가 팁, 주의사항, 추천 코스 등" },
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
9. **전문가 팁**: 등반 시 주의사항, 추천 코스, 준비물, 날씨별 팁 등을 자세히 설명하세요
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