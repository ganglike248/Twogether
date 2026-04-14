// src/services/cycleService.js
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

export const createCycle = async (cycleData, userId, coupleId) => {
  const { id: _, ...data } = cycleData;
  const newCycle = {
    ...data,
    coupleId,
    createdAt: serverTimestamp(),
    createdBy: userId,
  };
  const docRef = await addDoc(collection(db, 'cycles'), newCycle);
  return { id: docRef.id, ...newCycle };
};

export const deleteCycle = async (cycleId) => {
  await deleteDoc(doc(db, 'cycles', cycleId));
  return cycleId;
};
