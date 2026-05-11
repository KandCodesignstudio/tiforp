import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MOCK_NOTES } from '../config/mockData';

const USE_MOCK = true;

export function useNotes(jobId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    if (USE_MOCK) {
      setNotes(MOCK_NOTES[jobId] || []);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'jobs', jobId, 'notes'),
      orderBy('createdAt', 'asc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setNotes(data);
      setLoading(false);
    });
    return unsub;
  }, [jobId]);

  const addNote = async (jobId, text, author, tripNumber) => {
    if (USE_MOCK) {
      const newNote = {
        id: `note_${Date.now()}`,
        tripId: null,
        tripNumber,
        author,
        text,
        createdAt: new Date(),
      };
      setNotes((prev) => [...prev, newNote]);
      return;
    }
    await addDoc(collection(db, 'jobs', jobId, 'notes'), {
      text,
      author,
      tripNumber,
      createdAt: serverTimestamp(),
    });
  };

  return { notes, loading, addNote };
}
