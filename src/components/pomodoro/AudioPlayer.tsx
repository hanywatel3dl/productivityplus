import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Upload, 
  Music, Trash2, List, X, Repeat, Repeat1, Shuffle, Rewind, FastForward, 
  Loader2, Headphones, Pin, PinOff 
} from 'lucide-react';

// ====================================================================
// المكون الفرعي لموجات الصوت (مدمج هنا لسهولة النسخ في ملف واحد)
// ====================================================================
interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null; // يتلقى عنصر الصوت مباشرة
  isPlaying: boolean;
}

// إنشاء سياق الصوت والمحلل والمصدر كمراجع ثابتة خارج المكون
// هذا هو الحل الجذري لمشكلة عدم عمل الموجات بعد إعادة الفتح
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let source: MediaElementAudioSourceNode | null = null;

const AudioVisualizer = ({ audioElement, isPlaying }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    if (!audioElement) return;

    // تهيئة سياق الصوت والمحلل والمصدر مرة واحدة فقط على مستوى التطبيق
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256; 
        
        source = audioContext.createMediaElementSource(audioElement);
        source.connect(analyser);
        analyser.connect(audioContext.destination); 
      } catch (e) {
        console.error("Web Audio API is not supported or failed to initialize.", e);
        return; 
      }
    }
    
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying || !analyser) {
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        return;
      }

      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2.5; 
        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#fbbd24'); 
        gradient.addColorStop(1, '#f59e0b'); 
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    if (isPlaying) {
      if (audioContext?.state === 'suspended') {
        audioContext.resume();
      }
      draw();
    } else {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPlaying, audioElement]); 

  return <canvas ref={canvasRef} width="160" height="100" className="w-full h-full" />;
};


// ====================================================================
// المكون الرئيسي لمشغل الصوت
// ====================================================================

type RepeatMode = 'none' | 'all' | 'one';

// تم تعديل الواجهة لتلقي isPinned و setIsPinned من المكون الأب (AudioPlayerToggle)
interface AudioPlayerProps {
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void; 
}

interface AudioState {
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  fileName: string;
}

interface AudioFile {
  id: string;
  name: string;
  url: string;
  type: string;
  blob?: Blob; 
}

// إنشاء عنصر صوتي وحيد خارج المكون لمنع إعادة إنشائه
let globalAudioElement: HTMLAudioElement | null = null;

export const AudioPlayer = ({ isPinned, setIsPinned }: AudioPlayerProps) => {
  // 1. تعريفات الـ State Hooks
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false); 
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [volume, setVolume] = useState(0.5);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none');
  const [isShuffle, setIsShuffle] = useState(false);
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);

  // 2. تعريفات الـ Ref Hooks
  const dbRef = useRef<IDBDatabase | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null); 
  const saveIntervalRef = useRef<number | null>(null); 
  const isMountedRef = useRef<boolean>(true); 

  // 3. الدوال المساعدة (غير Hooks)
  const shuffleArray = (array: number[]) => {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array]; 
    while (currentIndex !== 0) {
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
      [newArray[currentIndex], newArray[randomIndex]] = [newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'; 
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 4. الدوال التي تستخدم useCallback (جميعها هنا أولاً)
  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);
  
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    const newMuteState = !isMuted;
    audioRef.current.muted = newMuteState;
    setIsMuted(newMuteState);
  }, [isMuted]);
  
  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setIsMuted(newVolume === 0); 
    }
  }, []);
  
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);
  
  const handleSkipForward10 = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, audioRef.current.duration || 0);
    }
  }, []);
  
  const handleSkipBackward10 = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  }, []);
  
  const toggleShuffle = useCallback(() => {
    const newShuffleState = !isShuffle;
    setIsShuffle(newShuffleState);
    localStorage.setItem('audioPlayerIsShuffle', String(newShuffleState));
  }, [isShuffle]);

  const cycleRepeatMode = useCallback(() => {
    const modes: RepeatMode[] = ['none', 'all', 'one'];
    const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
    const newMode = modes[nextIndex];
    setRepeatMode(newMode);
    localStorage.setItem('audioPlayerRepeatMode', newMode);
  }, [repeatMode]);

  const playNextTrack = useCallback(() => {
    if (audioFiles.length === 0) {
      setIsPlaying(false);
      setCurrentTrackIndex(-1);
      return;
    }

    const indices = isShuffle ? shuffledIndices : Array.from(audioFiles.keys());
    if (indices.length === 0) { 
        setIsPlaying(false);
        setCurrentTrackIndex(-1);
        return;
    }

    let currentPosInSequence = -1;
    if (currentTrackIndex !== -1) {
        currentPosInSequence = indices.indexOf(currentTrackIndex);
    }
    
    let nextRealIndex;
    if (currentPosInSequence === -1 || currentPosInSequence === indices.length - 1) {
      if (repeatMode === 'all') {
        nextRealIndex = indices[0]; 
      } else {
        setIsPlaying(false); 
        setCurrentTrackIndex(-1); 
        return; 
      }
    } else {
      nextRealIndex = indices[currentPosInSequence + 1]; 
    }
    
    setCurrentTrackIndex(nextRealIndex);
    setIsPlaying(true); 
  }, [audioFiles, currentTrackIndex, isShuffle, shuffledIndices, repeatMode]);
  
  const playPreviousTrack = useCallback(() => {
    if (audioFiles.length === 0) return;

    const indices = isShuffle ? shuffledIndices : Array.from(audioFiles.keys());
    if (indices.length === 0) return;

    let currentPosInSequence = -1;
    if (currentTrackIndex !== -1) {
        currentPosInSequence = indices.indexOf(currentTrackIndex);
    }

    let prevRealIndex;
    if (currentPosInSequence === -1 || currentPosInSequence === 0) {
      prevRealIndex = indices[indices.length - 1];
    } else {
      prevRealIndex = indices[currentPosInSequence - 1]; 
    }
    
    setCurrentTrackIndex(prevRealIndex);
    setIsPlaying(true); 
  }, [audioFiles, currentTrackIndex, isShuffle, shuffledIndices]);
  
  const handleTrackSelect = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true); 
    setShowPlaylist(false); 
  }, []);
  
  const loadAudioData = useCallback(async (file: AudioFile, index: number) => {
    if (!dbRef.current || !isMountedRef.current || file.url) return file; 
    
    try {
      const fileData = await new Promise<any>((resolve, reject) => {
        const transaction = dbRef.current!.transaction(['audioFiles'], 'readonly');
        const store = transaction.objectStore('audioFiles');
        const request = store.get(file.id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      if (fileData && fileData.data) {
        const byteString = atob(fileData.data.split(',')[1]);
        const mimeString = fileData.data.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        const url = URL.createObjectURL(blob);
        
        setAudioFiles(prev => {
          const newFiles = [...prev];
          if (newFiles[index]) { 
            newFiles[index] = {
              ...newFiles[index],
              url,
              blob
            };
          }
          return newFiles;
        });
        
        return { ...file, url, blob }; 
      }
      return file; 
    } catch (error) {
      console.error('Error loading audio data:', error);
      return file;
    }
  }, []); 

  const deleteTrack = useCallback(async (id: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation(); 
    
    if (!dbRef.current) return;
    
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = dbRef.current!.transaction(['audioFiles'], 'readwrite');
        const store = transaction.objectStore('audioFiles');
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      const fileToDelete = audioFiles[index];
      if (fileToDelete?.url) { 
        URL.revokeObjectURL(fileToDelete.url);
      }
      
      setAudioFiles(prev => {
        const newFiles = [...prev];
        newFiles.splice(index, 1);
        return newFiles;
      });
      
      if (audioFiles.length <= 1) { 
        setCurrentTrackIndex(-1);
        setIsPlaying(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = ''; 
          setCurrentTime(0);
          setDuration(0);
        }
      } else if (index === currentTrackIndex) {
        playNextTrack(); 
      } else if (index < currentTrackIndex) {
        setCurrentTrackIndex(currentTrackIndex - 1);
      }
    } catch (error) {
      console.error('Error deleting track:', error);
    }
  }, [audioFiles, currentTrackIndex, playNextTrack]); 
  
  const loadSavedAudio = useCallback(async () => {
    if (!dbRef.current || !isMountedRef.current) return;
    
    try {
      setIsLoading(true);
      
      const loadedFiles = await new Promise<AudioFile[]>((resolve, reject) => {
        const transaction = dbRef.current!.transaction(['audioFiles'], 'readonly');
        const store = transaction.objectStore('audioFiles');
        const request = store.getAll();
        
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.map((file: any) => ({
            id: file.id || crypto.randomUUID(),
            name: file.name,
            url: '', 
            type: file.type,
            blob: null 
          })) : []);
        };
        request.onerror = () => reject(request.error);
      });
      
      if (loadedFiles.length > 0) {
        setAudioFiles(loadedFiles);
        
        const lastPlayedIndexStr = localStorage.getItem('lastPlayedAudioIndex');
        if (lastPlayedIndexStr !== null) {
          const index = parseInt(lastPlayedIndexStr, 10);
          if (index >= 0 && index < loadedFiles.length) {
            await loadAudioData(loadedFiles[index], index);
            setCurrentTrackIndex(index);
            
            const savedAudioStatesStr = localStorage.getItem('audioPlayerStates');
            if (savedAudioStatesStr) {
              const states = JSON.parse(savedAudioStatesStr) as Record<string, AudioState>;
              const fileName = loadedFiles[index].name;
              
              if (states[fileName]) {
                const state = states[fileName];
                setVolume(state.volume);
                setCurrentTime(state.currentTime);
                
                if (audioRef.current) {
                  audioRef.current.volume = state.volume;
                  audioRef.current.currentTime = state.currentTime;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading saved audio:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadAudioData]); 
  
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !dbRef.current) return;
    
    try {
      setIsLoading(true);
      
      const filesToProcess = Array.from(files).filter(file => file.type.includes('audio') || file.type.includes('video'));
      
      const newFilesMetadata: AudioFile[] = filesToProcess.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        url: '', 
        type: file.type
      }));
      
      const currentFileCount = audioFiles.length; 
      setAudioFiles(prev => [...prev, ...newFilesMetadata]);
      
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const metadata = newFilesMetadata[i];
        
        const dataURI = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
        
        await new Promise<void>((resolve, reject) => {
          const transaction = dbRef.current!.transaction(['audioFiles'], 'readwrite');
          const store = transaction.objectStore('audioFiles');
          
          const request = store.put({
            id: metadata.id,
            name: file.name,
            type: file.type,
            data: dataURI,
            lastModified: new Date().toISOString()
          });
          
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
        
        const blob = new Blob([file], { type: file.type });
        const url = URL.createObjectURL(blob);
        
        setAudioFiles(prev => {
          const newFiles = [...prev];
          if (newFiles[currentFileCount + i]) { 
            newFiles[currentFileCount + i] = {
              ...newFiles[currentFileCount + i],
              url,
              blob
            };
          }
          return newFiles;
        });
      }
      
      if (currentTrackIndex === -1 && newFilesMetadata.length > 0) {
        setCurrentTrackIndex(currentFileCount);
      }
    } catch (error) {
      console.error('Error processing audio files:', error);
    } finally {
      setIsLoading(false);
      event.target.value = ''; 
    }
  }, [audioFiles.length, currentTrackIndex]); 

  // 5. الـ useEffect Hooks
  
  const saveIntervalRefLocal = useRef<number | null>(null); // استخدام ref محلي لـ setInterval
  // استعادة إعدادات التشغيل العشوائي والتكرار من localStorage عند تحميل المكون
  useEffect(() => {
    const savedRepeatMode = localStorage.getItem('audioPlayerRepeatMode') as RepeatMode;
    const savedIsShuffle = localStorage.getItem('audioPlayerIsShuffle') === 'true';
    if (savedRepeatMode && ['none', 'all', 'one'].includes(savedRepeatMode)) {
      setRepeatMode(savedRepeatMode);
    }
    if (savedIsShuffle) {
      setIsShuffle(savedIsShuffle);
    }
  }, []); 

  // تأثير جانبي لتوليد القائمة العشوائية عند تفعيل isShuffle أو تغيير قائمة الملفات
  useEffect(() => {
    if (isShuffle && audioFiles.length > 0) {
      const indices = Array.from(audioFiles.keys()); 
      const shuffled = shuffleArray(indices);
      
      if (currentTrackIndex !== -1) {
        const currentTrackRealIndex = shuffled.indexOf(currentTrackIndex);
        if (currentTrackRealIndex > 0) {
          [shuffled[0], shuffled[currentTrackRealIndex]] = [shuffled[currentTrackRealIndex], shuffled[0]];
        }
      }
      setShuffledIndices(shuffled);
    } else {
      setShuffledIndices(Array.from(audioFiles.keys()));
    }
  }, [isShuffle, audioFiles.length, currentTrackIndex]); 

  // تهيئة اتصال قاعدة البيانات IndexedDB مرة واحدة
  useEffect(() => {
    let isMounted = true;
    
    const openDB = () => {
      const request = indexedDB.open('AudioFilesDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('audioFiles')) {
          db.createObjectStore('audioFiles', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event) => {
        if (isMounted) {
          dbRef.current = (event.target as IDBOpenDBRequest).result;
          loadSavedAudio(); 
        }
      };
      
      request.onerror = () => {
        console.error('Error opening IndexedDB');
      };
    };
    
    openDB();
    
    return () => {
      isMounted = false; 
    };
  }, [loadSavedAudio]); 

  // تهيئة عنصر الصوت وإضافة مستمعي الأحداث مرة واحدة
  useEffect(() => {
    // استخدم globalAudioElement هنا
    if (!globalAudioElement) {
      globalAudioElement = new Audio();
    }
    audioRef.current = globalAudioElement; // ربط الـ ref بالعنصر العام
    
    // ضبط مستوى الصوت الأولي
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    
    // إضافة مستمعي الأحداث
    const handleTimeUpdate = () => {
      if (audioRef.current) { 
        setCurrentTime(audioRef.current.currentTime);
        setDuration(audioRef.current.duration || 0);
      }
    };
    
    const handleTrackEnd = () => {
      if (isMountedRef.current) { 
        if (repeatMode === 'one') {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
          }
        } else {
          playNextTrack();
        }
      }
    };
    
    // أضف المستمعين فقط إذا كان audioRef.current موجودًا
    if (audioRef.current) {
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('loadedmetadata', handleTimeUpdate);
      audioRef.current.addEventListener('ended', handleTrackEnd);
    }
    
    // دالة التنظيف عند إلغاء تركيب المكون
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleTimeUpdate);
        audioRef.current.removeEventListener('ended', handleTrackEnd);
      }
      if (saveIntervalRefLocal.current) { 
        clearInterval(saveIntervalRefLocal.current);
      }
    };
  }, [volume, repeatMode, playNextTrack]); 

  // تحديث عنصر الصوت عند تغيير المقطع الحالي
  useEffect(() => {
    if (currentTrackIndex < 0 || currentTrackIndex >= audioFiles.length) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; 
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
      }
      return;
    }
    
    const loadAndSetTrack = async () => {
      try {
        const currentFile = audioFiles[currentTrackIndex];
        
        let fileWithData = currentFile;
        if (!currentFile.url) {
          fileWithData = await loadAudioData(currentFile, currentTrackIndex);
        }
        
        if (audioRef.current && fileWithData.url) {
          if (audioRef.current.src !== fileWithData.url) {
            audioRef.current.src = fileWithData.url;
            audioRef.current.load(); 
          }
          
          const savedAudioStatesStr = localStorage.getItem('audioPlayerStates');
          if (savedAudioStatesStr) {
            const states = JSON.parse(savedAudioStatesStr) as Record<string, AudioState>;
            const state = states[fileWithData.name];
            audioRef.current.currentTime = state ? state.currentTime : 0;
            setCurrentTime(state ? state.currentTime : 0);
          } else {
            audioRef.current.currentTime = 0;
            setCurrentTime(0);
          }
          
          localStorage.setItem('lastPlayedAudioIndex', currentTrackIndex.toString());
        }
      } catch (error) {
        console.error('Error updating track:', error);
      }
    };
    
    loadAndSetTrack();
  }, [currentTrackIndex, audioFiles, loadAudioData]); 

  // تأثير جانبي منفصل لضبط التشغيل/الإيقاف المؤقت
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying && currentTrackIndex !== -1) { 
        audioRef.current.play().catch(e => {
          console.log('Play prevented:', e);
          setIsPlaying(false); 
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]); 

  // حفظ حالة الصوت بشكل دوري عند التشغيل
  useEffect(() => {
    let saveIntervalRefCurrent = saveIntervalRefLocal.current; 
    if (saveIntervalRefCurrent) {
      clearInterval(saveIntervalRefCurrent);
    }
    
    const saveAudioState = () => {
      if (!audioRef.current || currentTrackIndex < 0 || currentTrackIndex >= audioFiles.length) return;
      
      try {
        const currentFile = audioFiles[currentTrackIndex];
        if (!currentFile) return;
        
        const currentStatesStr = localStorage.getItem('audioPlayerStates');
        const states: Record<string, AudioState> = currentStatesStr 
          ? JSON.parse(currentStatesStr) 
          : {};
        
        states[currentFile.name] = {
          currentTime: audioRef.current.currentTime,
          isPlaying, 
          volume,
          fileName: currentFile.name
        };
        
        localStorage.setItem('audioPlayerStates', JSON.stringify(states));
      } catch (error) {
        console.error('Error saving audio state:', error);
      }
    };
    
    if (isPlaying && currentTrackIndex >= 0) {
      saveIntervalRefCurrent = window.setInterval(saveAudioState, 5000); 
      saveIntervalRefLocal.current = saveIntervalRefCurrent; 
    }
    
    if (currentTrackIndex >= 0) {
      saveAudioState(); 
    }
    
    return () => {
      if (saveIntervalRefCurrent) { 
        clearInterval(saveIntervalRefCurrent);
      }
    };
  }, [isPlaying, currentTrackIndex, volume, audioFiles]); 
  
  // 6. كود العرض (JSX)
  
  // العرض في الوضع العمودي (الافتراضي) - **النسخة النهائية الاحترافية**
  return (
    <div className={`w-[360px] flex flex-col bg-gradient-to-b from-[#2D1B69] to-[#1e1247] backdrop-blur-lg rounded-2xl shadow-2xl text-white max-h-[90vh]`}>
      {/* 
        الحاوية الرئيسية للمشغل العمودي:
        - max-h-[90vh]: يحدد أقصى ارتفاع للمكون لضمان عدم خروجه عن الشاشة.
        - flex-col: لترتيب المحتوى عموديًا.
        - w-[360px]: عرض ثابت كما هو في الصورة
      */}
      
      {/* Header with Upload Button */}
      <div className="p-4 pb-0 flex-shrink-0"> 
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-bold">مشغل الصوت</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* زر رفع الملفات الجديدة */}
            <motion.label whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors cursor-pointer" title="رفع ملفات جديدة">
              <Upload className="w-5 h-5" />
              <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" multiple />
            </motion.label>
            {/* زر التثبيت/إلغاء التثبيت */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPinned(!isPinned)} 
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
              title={isPinned ? "إلغاء التثبيت" : "تثبيت المشغل"}
            >
              {isPinned ? <PinOff className="w-5 h-5 text-amber-400" /> : <Pin className="w-5 h-5" />}
            </motion.button>
            {/* زر القائمة/إغلاق القائمة */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowPlaylist(!showPlaylist)}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors duration-200"
              title={showPlaylist ? "إغلاق القائمة" : "فتح القائمة"}
            >
              {showPlaylist ? <X className="w-5 h-5" /> : <List className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main content area, scrollable with correct padding */}
      <div className="flex-grow p-4 space-y-4 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {showPlaylist && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="overflow-hidden flex-shrink-0 origin-top"
            >
              {/* تصغير ارتفاع القائمة لـ 3 عناصر */}
              <div className="bg-black/20 rounded-lg p-2 space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4 text-purple-300">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    جاري التحميل...
                  </div>
                ) : audioFiles.length === 0 ? (
                  <div className="text-center text-purple-300 py-4 flex flex-col items-center gap-4">
                      <p>لا توجد ملفات صوتية بعد</p>
                      <motion.label
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="cursor-pointer px-4 py-2 rounded-lg bg-amber-400 text-purple-900 font-bold flex items-center gap-2 text-sm"
                        title="تحميل ملفات صوتية جديدة"
                      >
                        <Upload className="w-4 h-4" />
                        تحميل أول ملف
                        <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" multiple />
                      </motion.label>
                  </div>
                ) : (
                  audioFiles.map((file, index) => (
                    <div key={file.id} onClick={() => handleTrackSelect(index)} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors duration-200 ${ index === currentTrackIndex ? 'bg-amber-400/20 text-amber-400' : 'hover:bg-white/10 text-white' }`}>
                      <div className="truncate flex-1 text-sm flex items-center gap-2">
                        {/* أيقونة سماعة الرأس للمقطع الحالي */}
                        {index === currentTrackIndex ? <motion.div layoutId="playing-icon" className="flex-shrink-0"><Headphones className="w-4 h-4 text-amber-400"/></motion.div> : <div className="w-4 h-4 flex-shrink-0" />}
                        {file.name}
                      </div>
                      <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }} onClick={(e) => deleteTrack(file.id, index, e)} className="p-1 rounded-full hover:bg-red-500/30 text-red-400/70 hover:text-red-400 transition-colors duration-200" title="حذف المقطع">
                        <Trash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* قسم معلومات المقطع */}
        <div className="flex flex-col items-center gap-4 text-center flex-shrink-0">
          <div className="w-40 h-40 bg-black/20 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
            {/* هنا يتم عرض موجات الصوت أو أيقونة الموسيقى الافتراضية */}
            {currentTrackIndex !== -1 && audioFiles[currentTrackIndex]?.url && (audioRef.current && isPlaying) ? (
              <AudioVisualizer audioElement={globalAudioElement} isPlaying={isPlaying} />
            ) : (
              <Music className="w-20 h-20 text-amber-400/50" />
            )}
          </div>
          <div className="w-full">
            <h4 className="text-lg font-semibold truncate">
              {currentTrackIndex >= 0 ? audioFiles[currentTrackIndex]?.name : "لم يتم تحديد مقطع"}
            </h4>
            <p className="text-sm text-white/60">
              {currentTrackIndex >= 0 ? (isPlaying ? "قيد التشغيل الآن" : "متوقف مؤقتاً") : "في انتظارك"}
            </p>
          </div>
        </div>

        {/* قسم شريط التقدم والوقت */}
        <div className="space-y-2 flex-shrink-0">
          <input
            type="range" min={0} max={duration || 0} value={currentTime} onChange={handleSeek}
            disabled={currentTrackIndex < 0}
            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400 disabled:opacity-50"
            aria-label="التقدم في المقطع"
          />
          <div className="flex justify-between text-xs font-mono text-white/60">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* أزرار التحكم الرئيسية - تصميم بسيط بدون خلفيات وترتيب احترافي */}
        <div className="flex items-center justify-between flex-shrink-0">
          {/* زر التشغيل العشوائي (أقصى اليسار) */}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleShuffle} className={`p-2 transition-colors duration-200 ${isShuffle ? 'text-amber-400' : 'text-white/60 hover:text-white'}`} title={isShuffle ? 'إلغاء التشغيل العشوائي' : 'تشغيل عشوائي'}>
            <Shuffle className="w-5 h-5" />
          </motion.button>
          
          <div className="flex items-center gap-3"> {/* تم تغيير gap إلى 3 للتقارب أكثر */}
            {/* زر المقطع السابق (يسار) */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={playPreviousTrack} className="p-2 text-white/80 hover:text-white" title="المقطع السابق">
              <SkipBack className="w-6 h-6" />
            </motion.button>
            {/* زر الرجوع 10 ثواني (أقرب لزر التشغيل) */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleSkipBackward10} className="p-2 text-white/80 hover:text-white" title="رجوع 10 ثواني">
              <Rewind className="w-6 h-6" />
            </motion.button>
            
            {/* زر التشغيل الرئيسي (في المنتصف) */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={togglePlay} className="p-2 text-amber-400" title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}>
              {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10" />} {/* حجم 10*10 لزر التشغيل */}
            </motion.button>
            
            {/* زر التقديم 10 ثواني (أقرب لزر التشغيل) */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleSkipForward10} className="p-2 text-white/80 hover:text-white" title="تقديم 10 ثواني">
              <FastForward className="w-6 h-6" />
            </motion.button>
            {/* زر المقطع التالي (يمين) */}
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={playNextTrack} className="p-2 text-white/80 hover:text-white" title="المقطع التالي">
              <SkipForward className="w-6 h-6" />
            </motion.button>
          </div>
          
          {/* زر التكرار (أقصى اليمين) */}
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={cycleRepeatMode} className={`p-2 transition-colors duration-200 ${repeatMode !== 'none' ? 'text-amber-400' : 'text-white/60 hover:text-white'}`} title={repeatMode === 'one' ? 'تكرار مقطع واحد' : repeatMode === 'all' ? 'تكرار الكل' : 'بدون تكرار'}>
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </motion.button>
        </div>

        {/* قسم التحكم في مستوى الصوت */}
        <div className="flex items-center gap-3 pt-2 flex-shrink-0">
          {/* زر كتم الصوت / إلغاء الكتم */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleMute}
            className="p-1 rounded-full text-white/70 hover:text-white"
            title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </motion.button>
          <input
            type="range" min={0} max={1} step={0.01} value={volume} onChange={handleVolumeChange}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            aria-label="التحكم في مستوى الصوت"
          />
          <span className="text-xs font-mono text-white/60 w-8 text-center">{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
};