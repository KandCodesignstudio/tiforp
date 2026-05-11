import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MOCK_JOBS } from '../config/mockData';

const USE_MOCK = true; // Set to false after configuring Firebase

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_MOCK) {
      setJobs(MOCK_JOBS);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setJobs(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateJobStatus = async (jobId, status) => {
    if (USE_MOCK) return;
    await updateDoc(doc(db, 'jobs', jobId), { status });
  };

  return { jobs, loading, updateJobStatus };
}
