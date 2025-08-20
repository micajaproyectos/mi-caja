import { openDB } from 'idb';

const DB_NAME = 'mi-caja';
const STORE_NAME = 'inventarioIA_draft';
const DB_VERSION = 1;

// Abrir la base de datos
const openDatabase = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Crear el store si no existe
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    },
  });
};

// Obtener el borrador del usuario
export const getDraft = async (userId) => {
  try {
    const db = await openDatabase();
    const draft = await db.get(STORE_NAME, userId);
    return draft?.data || null;
  } catch (error) {
    console.error('Error al obtener borrador:', error);
    return null;
  }
};

// Guardar el borrador del usuario
export const setDraft = async (userId, draft) => {
  try {
    const db = await openDatabase();
    await db.put(STORE_NAME, {
      userId,
      data: draft,
      timestamp: Date.now()
    });
    return true;
  } catch (error) {
    console.error('Error al guardar borrador:', error);
    return false;
  }
};

// Limpiar el borrador del usuario
export const clearDraft = async (userId) => {
  try {
    const db = await openDatabase();
    await db.delete(STORE_NAME, userId);
    return true;
  } catch (error) {
    console.error('Error al limpiar borrador:', error);
    return false;
  }
};
