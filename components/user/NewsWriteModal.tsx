import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { storage, db } from '../../services/firebase';
import type { NewsItem, Place } from '../../types';

interface NewsWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  spots: Place[];
}

type CategoryType = 'new_spot' | 'trending' | 'seasonal' | 'event';

interface CategoryOption {
  type: CategoryType;
  label: string;
  icon: string;
  color: string;
}

const CATEGORIES: CategoryOption[] = [
  { type: 'new_spot', label: '신규', icon: '✨', color: 'from-purple-400 to-pink-500' },
  { type: 'trending', label: '인기', icon: '🔥', color: 'from-orange-400 to-red-500' },
  { type: 'seasonal', label: '계절', icon: '🌸', color: 'from-green-400 to-emerald-500' },
  { type: 'event', label: '이벤트', icon: '🎉', color: 'from-blue-400 to-cyan-500' },
];

const NewsWriteModal: React.FC<NewsWriteModalProps> = ({ isOpen, onClose, onSuccess, spots }) => {
  const [step, setStep] = useState<'category' | 'write'>('category');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [selectedSpots, setSelectedSpots] = useState<string[]>([]); // place_id 배열
  const [spotSearchQuery, setSpotSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCategorySelect = (category: CategoryType) => {
    setSelectedCategory(category);
    setStep('write');
  };

  const handleClose = () => {
    setStep('category');
    setSelectedCategory(null);
    setTitle('');
    setContent('');
    setImages([]);
    setSelectedSpots([]);
    setSpotSearchQuery('');
    setError('');
    onClose();
  };

  // 스팟 검색 필터링
  const filteredSpots = spots.filter(spot =>
    spot.place_name.toLowerCase().includes(spotSearchQuery.toLowerCase()) ||
    spot.address?.toLowerCase().includes(spotSearchQuery.toLowerCase())
  ).slice(0, 5); // 최대 5개만 표시

  // 스팟 선택/해제
  const toggleSpot = (placeId: string) => {
    setSelectedSpots(prev =>
      prev.includes(placeId)
        ? prev.filter(id => id !== placeId)
        : [...prev, placeId]
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    addImages(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addImages(files);
    }
  };

  const addImages = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const totalImages = images.length + imageFiles.length;

    if (totalImages > 5) {
      setError('이미지는 최대 5장까지 업로드 가능합니다.');
      return;
    }

    setImages(prev => [...prev, ...imageFiles]);
    setError('');
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    setImages(prev => {
      const newImages = [...prev];
      const [movedImage] = newImages.splice(fromIndex, 1);
      newImages.splice(toIndex, 0, movedImage);
      return newImages;
    });
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setError('카테고리를 선택해주세요.');
      return;
    }

    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    if (!content.trim()) {
      setError('내용을 입력해주세요.');
      return;
    }

    if (images.length === 0) {
      setError('최소 1장의 이미지를 업로드해주세요.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 이미지 업로드
      const imageUrls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const timestamp = Date.now();
        const fileName = `news/${timestamp}_${i}_${image.name}`;
        const storageRef = ref(storage, fileName);

        await uploadBytes(storageRef, image);
        const url = await getDownloadURL(storageRef);
        imageUrls.push(url);
      }

      // 날짜 정보가 포함된 이미지 데이터 생성
      const imageDataWithDates = imageUrls.map(url => ({
        url,
        uploaded_at: new Date().toISOString(),
      }));

      // Firestore에 저장
      const newsData = {
        title: title.trim(),
        content: content.trim(),
        type: selectedCategory,
        images: imageUrls, // 기존 호환성 유지
        image_data: imageDataWithDates, // 날짜 정보 포함
        thumbnail: imageUrls[0], // 첫 번째 이미지가 썸네일
        related_spot_ids: selectedSpots, // 선택된 스팟들
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };

      await addDoc(collection(db, 'news'), newsData);

      // 관련 스팟들의 이미지 갤러리에 뉴스 이미지 추가
      if (selectedSpots.length > 0) {
        for (const placeId of selectedSpots) {
          try {
            // 스팟 문서 찾기 (spots 컬렉션에서 place_id 필드로 검색)
            const spotRef = doc(db, 'spots', placeId);
            const spotDoc = await getDoc(spotRef);

            if (spotDoc.exists()) {
              // 기존 이미지 가져오기
              const existingImages = spotDoc.data().images || [];

              // 새 이미지들을 날짜 정보와 함께 추가
              const newImages = imageDataWithDates.map(imgData => ({
                url: imgData.url,
                uploaded_at: imgData.uploaded_at,
                source: 'news', // 뉴스에서 추가된 이미지임을 표시
              }));

              // 이미지 배열 업데이트 (중복 방지)
              const updatedImages = [...existingImages];
              newImages.forEach(newImg => {
                // 같은 URL이 없으면 추가
                if (!updatedImages.find(img => img.url === newImg.url)) {
                  updatedImages.push(newImg);
                }
              });

              await updateDoc(spotRef, {
                images: updatedImages,
                updated_at: serverTimestamp(),
              });

              console.log(`✅ 스팟 "${placeId}"에 이미지 ${newImages.length}개 추가됨`);
            }
          } catch (err) {
            console.error(`❌ 스팟 "${placeId}" 이미지 업데이트 실패:`, err);
            // 에러가 나도 뉴스 등록은 성공했으므로 계속 진행
          }
        }
      }

      // 성공
      onSuccess();
      handleClose();
    } catch (err) {
      console.error('뉴스 등록 오류:', err);
      setError('뉴스 등록 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryInfo = CATEGORIES.find(c => c.type === selectedCategory);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {step === 'category' ? '📰 카테고리 선택' : '✍️ 최신 소식 작성'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'category' ? (
            /* 카테고리 선택 화면 */
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map((category) => (
                <button
                  key={category.type}
                  onClick={() => handleCategorySelect(category.type)}
                  className={`
                    bg-gradient-to-br ${category.color}
                    text-white rounded-xl p-8
                    transform transition-all duration-200
                    hover:scale-105 hover:shadow-xl
                    active:scale-95
                    flex flex-col items-center justify-center space-y-3
                  `}
                >
                  <span className="text-5xl">{category.icon}</span>
                  <span className="text-xl font-bold">{category.label}</span>
                </button>
              ))}
            </div>
          ) : (
            /* 작성 화면 */
            <div className="space-y-6">
              {/* 선택된 카테고리 표시 */}
              {selectedCategoryInfo && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{selectedCategoryInfo.icon}</span>
                  <div>
                    <p className="text-sm text-gray-500">카테고리</p>
                    <p className="font-semibold text-gray-800">{selectedCategoryInfo.label}</p>
                  </div>
                  <button
                    onClick={() => setStep('category')}
                    className="ml-auto text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    변경
                  </button>
                </div>
              )}

              {/* 이미지 업로드 영역 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  이미지 ({images.length}/5)
                </label>

                {/* 드래그 앤 드롭 영역 */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}
                    ${images.length >= 5 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  onClick={() => {
                    if (images.length < 5) {
                      document.getElementById('file-input')?.click();
                    }
                  }}
                >
                  <div className="space-y-2">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <p className="text-gray-600">
                      {images.length >= 5
                        ? '최대 5장까지 업로드 가능합니다'
                        : '이미지를 드래그하거나 클릭하여 업로드'}
                    </p>
                    <p className="text-sm text-gray-500">첫 번째 이미지가 썸네일로 사용됩니다</p>
                  </div>
                </div>

                <input
                  id="file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={images.length >= 5}
                />

                {/* 이미지 프리뷰 */}
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        {index === 0 && (
                          <div className="absolute top-1 left-1 bg-indigo-600 text-white text-xs px-2 py-1 rounded">
                            썸네일
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        {/* 순서 변경 버튼 */}
                        <div className="absolute bottom-1 left-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {index > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveImage(index, index - 1);
                              }}
                              className="flex-1 bg-white text-gray-700 text-xs py-1 rounded"
                            >
                              ←
                            </button>
                          )}
                          {index < images.length - 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveImage(index, index + 1);
                              }}
                              className="flex-1 bg-white text-gray-700 text-xs py-1 rounded"
                            >
                              →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 제목 입력 */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  제목
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="제목을 입력하세요"
                  maxLength={100}
                />
              </div>

              {/* 내용 입력 */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  내용
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                  placeholder="내용을 입력하세요"
                  rows={8}
                />
              </div>

              {/* 연관 스팟 선택 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연관 스팟 선택 (선택사항)
                </label>

                {/* 검색창 */}
                <div className="relative mb-3">
                  <input
                    type="text"
                    value={spotSearchQuery}
                    onChange={(e) => setSpotSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="스팟 이름 또는 주소로 검색..."
                  />
                  <svg
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                {/* 선택된 스팟 표시 */}
                {selectedSpots.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedSpots.map(placeId => {
                      const spot = spots.find(s => s.place_id === placeId);
                      if (!spot) return null;
                      return (
                        <div
                          key={placeId}
                          className="flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm"
                        >
                          <span>{spot.place_name}</span>
                          <button
                            onClick={() => toggleSpot(placeId)}
                            className="hover:text-indigo-900"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 검색 결과 */}
                {spotSearchQuery && filteredSpots.length > 0 && (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {filteredSpots.map(spot => {
                      const isSelected = selectedSpots.includes(spot.place_id);
                      return (
                        <button
                          key={spot.place_id}
                          onClick={() => toggleSpot(spot.place_id)}
                          className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-indigo-50' : ''
                          }`}
                        >
                          {spot.thumbnail_url && (
                            <img
                              src={spot.thumbnail_url}
                              alt={spot.place_name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-800">{spot.place_name}</p>
                            {spot.address && (
                              <p className="text-sm text-gray-500 truncate">{spot.address}</p>
                            )}
                          </div>
                          {isSelected && (
                            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {spotSearchQuery && filteredSpots.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">검색 결과가 없습니다</p>
                )}
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        {step === 'write' && (
          <div className="border-t p-6 flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsWriteModal;
