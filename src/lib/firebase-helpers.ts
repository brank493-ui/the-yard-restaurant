import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  addDoc,
  serverTimestamp,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './firebase';

// Convert Firestore timestamp to Date
export function convertTimestamp(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// Convert document to typed object
export function docToObj<T>(doc: DocumentData): T & { id: string } {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
  } as T & { id: string };
}

// Generic CRUD operations
export async function getDocument<T>(collectionName: string, id: string): Promise<(T & { id: string }) | null> {
  if (!db) {
    console.warn('Firestore not initialized');
    return null;
  }
  
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docToObj<T>(docSnap);
    }
    return null;
  } catch (error) {
    console.error(`Error getting document ${id} from ${collectionName}:`, error);
    return null;
  }
}

export async function getDocuments<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  if (!db) {
    console.warn('Firestore not initialized');
    return [];
  }
  
  try {
    const collectionRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : query(collectionRef);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => docToObj<T>(doc));
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    return [];
  }
}

export async function createDocument<T extends Record<string, unknown>>(
  collectionName: string,
  data: T
): Promise<string | null> {
  if (!db) {
    console.warn('Firestore not initialized');
    return null;
  }
  
  try {
    const collectionRef = collection(db, collectionName);
    const docRef = await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    return null;
  }
}

export async function setDocument<T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  data: T
): Promise<boolean> {
  if (!db) {
    console.warn('Firestore not initialized');
    return false;
  }
  
  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Error setting document ${id} in ${collectionName}:`, error);
    return false;
  }
}

export async function updateDocument<T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<boolean> {
  if (!db) {
    console.warn('Firestore not initialized');
    return false;
  }
  
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Error updating document ${id} in ${collectionName}:`, error);
    return false;
  }
}

export async function deleteDocument(collectionName: string, id: string): Promise<boolean> {
  if (!db) {
    console.warn('Firestore not initialized');
    return false;
  }
  
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting document ${id} from ${collectionName}:`, error);
    return false;
  }
}

// Export query functions for building complex queries
export { collection, doc, query, where, orderBy, limit };
