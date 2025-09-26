import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { OroomImage } from '../types';

// 오름 이미지 업로드
export const uploadOroomImage = async (
  file: File,
  oroomId: string,
  category: 'parking' | 'entrance' | 'trail' | 'summit'
): Promise<string> => {
  try {
    // 파일 이름 생성 (중복 방지를 위해 timestamp 추가)
    const timestamp = Date.now();
    const fileName = `${file.name.split('.')[0]}_${timestamp}.${file.name.split('.').pop()}`;

    // Storage 경로 설정
    const storageRef = ref(storage, `orooms/${oroomId}/${category}/${fileName}`);

    // 파일 업로드
    const snapshot = await uploadBytes(storageRef, file);

    // 다운로드 URL 얻기
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log('이미지 업로드 완료:', downloadURL);
    return downloadURL;

  } catch (error) {
    console.error('이미지 업로드 오류:', error);
    throw new Error('이미지 업로드에 실패했습니다.');
  }
};

// 여러 이미지 동시 업로드
export const uploadMultipleImages = async (
  files: File[],
  oroomId: string,
  category: 'parking' | 'entrance' | 'trail' | 'summit'
): Promise<OroomImage[]> => {
  try {
    const uploadPromises = files.map(async (file, index) => {
      const url = await uploadOroomImage(file, oroomId, category);
      return {
        id: `${Date.now()}-${index}`,
        url,
        description: ''
      };
    });

    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('다중 이미지 업로드 오류:', error);
    throw new Error('이미지 업로드 중 오류가 발생했습니다.');
  }
};