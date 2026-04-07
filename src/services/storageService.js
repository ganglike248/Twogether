// src/services/storageService.js
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export const uploadEventImage = async (coupleId, storageId, file) => {
  const path = `events/${coupleId}/${storageId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

export const deleteEventImage = async (imageUrl) => {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (err) {
    // 이미 삭제된 파일이면 무시
    if (err.code !== 'storage/object-not-found') throw err;
  }
};
