import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Book, ChevronRight, ChevronLeft, Search, Bookmark, Info,
  Volume2, Settings, ChevronDown, BarChart2, ArrowRight, X
} from 'lucide-react';
import { useStore } from '../../store'; // افترض وجود store لإدارة الحالة العامة
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Fuse from 'fuse.js';

// --- واجهات البيانات ---
interface Surah {
  number: number;
  name: string; // الاسم النظيف بدون "سورة "
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  number: number; // Global Ayah number
  text: string;
  numberInSurah: number;
  juz: number;
  page: number;
  hizbQuarter: number; // تأكد من أن الـ API يرجع هذا الحقل
  surah: Surah; // كائن السورة النظيف مضمن هنا
  normalizedText?: string;
}

interface SearchResult extends Ayah {
  matches?: Array<{
    indices: number[][];
    key: string;
    value: string;
  }>;
}

interface Tafsir {
  text: string;
  source: string;
}

interface QuranReaderProps {
  onShowProgress: () => void;
}

// --- دالة مساعدة لإزالة التشكيل ---
const removeArabicDiacritics = (text: string): string => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u064B-\u065F]/g, "");
};


// --- المكون الرئيسي ---
export const QuranReader = ({ onShowProgress }: QuranReaderProps) => {
  // --- إدارة الحالة (من الكود الأصلي) ---
  const [currentPage, setCurrentPage] = useState(() => {
    const saved = localStorage.getItem('lastQuranPage');
    return saved ? parseInt(saved) : 1;
  });
  const [surahs, setSurahs] = useState<Surah[]>([]); // قائمة كل السور (أسماء نظيفة)
  const [currentSurahInfo, setCurrentSurahInfo] = useState<{ number: number; name: string } | null>(null); // معلومات السورة الحالية (اسم نظيف)
  const [ayahs, setAyahs] = useState<Ayah[]>([]); // آيات الصفحة الحالية
  const [allAyahs, setAllAyahs] = useState<Ayah[]>([]); // كل الآيات للبحث (أسماء نظيفة)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedAyahNumber, setSelectedAyahNumber] = useState<number | null>(null); // للتفسير
  const [tafsir, setTafsir] = useState<Tafsir | null>(null);
  const [showTafsir, setShowTafsir] = useState(false);
  const [showSurahSelect, setShowSurahSelect] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<string>(''); // للبحث بالرقم
  const [tafsirPosition, setTafsirPosition] = useState({ x: 0, y: 0 });
  const [hoveredAyahRef, setHoveredAyahRef] = useState<HTMLSpanElement | null>(null);
  const [fuseSearch, setFuseSearch] = useState<Fuse<Ayah> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [highlightedAyah, setHighlightedAyah] = useState<number | null>(null); // للتظليل المؤقت
  const [highlightAnimation, setHighlightAnimation] = useState<number | null>(null); // للأنيميشن الأصلي
  const [selectedAyahIndex, setSelectedAyahIndex] = useState<number | null>(null); // لتحديد السهم
  const [hizbQuarterInfo, setHizbQuarterInfo] = useState<number | null>(null); // لربع الحزب

  const { quranProgress, markPageCompleted } = useStore();
  const today = new Date().toISOString().split('T')[0];
  const isPageCompleted = quranProgress.some(p => p.page === currentPage && p.date === today);
  const quranContainerRef = useRef<HTMLDivElement>(null);
  const tafsirRef = useRef<HTMLDivElement>(null);
  const ayahRefs = useRef<{ [key: number]: HTMLSpanElement | null }>({});

  // --- التأثيرات الجانبية (Hooks) - من الكود الأصلي ---

  useEffect(() => {
    fetchSurahs();
    fetchAllAyahs();
  }, []);

  useEffect(() => {
    if (surahs.length > 0) {
      fetchPageContent(currentPage);
    }
    localStorage.setItem('lastQuranPage', currentPage.toString());
    // إعادة تعيين عند تغيير الصفحة
    setShowTafsir(false);
    setSelectedAyahNumber(null);
    setHighlightedAyah(null);
    setHighlightAnimation(null);
    setSelectedAyahIndex(null);
    setHizbQuarterInfo(null);
  }, [currentPage, surahs]);

  useEffect(() => {
    // تحديث موضع التفسير (من الأصلي)
    if (hoveredAyahRef && showTafsir && tafsirRef.current) {
       updateTafsirPosition(hoveredAyahRef);
    }
  }, [hoveredAyahRef, showTafsir, tafsir]);

  useEffect(() => {
    // تهيئة Fuse للبحث (من الأصلي)
    if (allAyahs.length > 0) {
      const options = {
        includeScore: true,
        includeMatches: true,
        threshold: 0.3,
        keys: ['normalizedText']
      };
      const validAyahsForFuse = allAyahs.filter(ayah => ayah.normalizedText);
      setFuseSearch(new Fuse(validAyahsForFuse, options));
    }
  }, [allAyahs]);

  useEffect(() => {
    // إخفاء التظليل المؤقت (من الأصلي)
    if (highlightedAyah !== null) {
      const timer = setTimeout(() => {
        setHighlightedAyah(null);
      }, 2000); // مدة التظليل
      return () => clearTimeout(timer);
    }
  }, [highlightedAyah]);

  useEffect(() => {
    // إيقاف أنيميشن التحديد (من الأصلي)
      if (highlightAnimation !== null) {
          const timer = setTimeout(() => {
              setHighlightAnimation(null); // أوقف الأنيميشن بعد فترة
          }, 1500); // نفس مدة الأنيميشن CSS
          return () => clearTimeout(timer);
      }
  }, [highlightAnimation]);


   useEffect(() => {
    // التعامل مع أسهم الكيبورد (من الأصلي)
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!ayahs.length || loading) return;

        const isPageNavKey = e.key === 'ArrowRight' || e.key === 'ArrowLeft';
        const isAyahNavKey = e.key === 'ArrowUp' || e.key === 'ArrowDown';

        if (isPageNavKey) {
            // تأكد من عدم وجود تركيز على حقول الإدخال
            if (document.activeElement?.tagName === 'INPUT') return;
            handlePageChange(e.key === 'ArrowLeft' ? currentPage + 1 : currentPage - 1);
            return;
        }

        if (isAyahNavKey) {
            e.preventDefault();
            const currentAyahElements = ayahs.map(a => ayahRefs.current[a.number]).filter(Boolean) as HTMLElement[];
            if(currentAyahElements.length === 0) return;

            let nextIndex: number | null = null;
            const currentIndex = selectedAyahIndex;

            if (currentIndex === null) {
                 // ابدأ من الآية الأولى عند الضغط لأول مرة (لأسفل)
                 if (e.key === 'ArrowDown') {
                     nextIndex = 0;
                 } else {
                      // أو انتقل للصفحة السابقة عند الضغط لأعلى إذا لم يكن هناك تحديد
                     if (currentPage > 1) handlePageChange(currentPage - 1);
                     return;
                 }
            } else {
                if (e.key === 'ArrowUp') {
                    if (currentIndex > 0) {
                        nextIndex = currentIndex - 1;
                    } else if (currentPage > 1) {
                        handlePageChange(currentPage - 1); // انتقل للصفحة السابقة
                        return;
                    }
                } else { // ArrowDown
                    if (currentIndex < ayahs.length - 1) {
                        nextIndex = currentIndex + 1;
                    } else if (currentPage < 604) {
                        handlePageChange(currentPage + 1); // انتقل للصفحة التالية
                        return;
                    }
                }
            }

            if(nextIndex !== null && nextIndex >= 0 && nextIndex < ayahs.length){
               setSelectedAyahIndex(nextIndex); // حدد الفهرس الجديد
               const targetAyah = ayahs[nextIndex];
               const targetElement = ayahRefs.current[targetAyah.number];
               if (targetElement) {
                 targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                 // استعادة سلوك الفتح عند التنقل بالأسهم (كما في الأصلي)
                 handleAyahClick(targetAyah.number, targetElement);
               }
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
   }, [currentPage, selectedAyahIndex, ayahs, loading]);

  // --- دوال جلب البيانات (من الكود الأصلي) ---

  const fetchSurahs = async () => {
    if (surahs.length > 0) return;
    try {
      console.log("Fetching surahs list...");
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.code === 200 && Array.isArray(data.data)) {
        // التنظيف هنا: إزالة "سورة " من الاسم إذا وجدت
        const cleanedSurahs = data.data.map((s: any) => ({
            ...s,
            name: s.name.replace(/^\s*/, '').trim() // اسم نظيف
        }));
        console.log("Cleaned surahs list fetched:", cleanedSurahs.length);
        setSurahs(cleanedSurahs);
      } else {
        throw new Error('Invalid surah list format');
      }
    } catch (err: any) {
      console.error('Error fetching surahs:', err);
      setError(err.message || 'حدث خطأ فادح: لم نتمكن من تحميل قائمة السور.');
      setLoading(false);
    }
  };

  const fetchAllAyahs = async () => {
     if (allAyahs.length > 0) return;
    try {
      console.log("Fetching all ayahs...");
      const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani');
       if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.code === 200 && data.data && Array.isArray(data.data.surahs)) {
        const allAyahsData: Ayah[] = [];
        data.data.surahs.forEach((surahData: any) => {
          // التنظيف هنا أيضًا لضمان التناسق
          const surahInfo: Surah = {
            number: surahData.number,
            name: surahData.name.replace(/^\s*/, '').trim(), // اسم نظيف
            englishName: surahData.englishName,
            englishNameTranslation: surahData.englishNameTranslation,
            numberOfAyahs: surahData.numberOfAyahs,
            revelationType: surahData.revelationType,
          };
          surahData.ayahs.forEach((ayah: any) => {
            allAyahsData.push({
              ...ayah,
              surah: surahInfo, // استخدام الكائن النظيف
              normalizedText: removeArabicDiacritics(ayah.text)
            });
          });
        });
        console.log("All ayahs fetched:", allAyahsData.length);
        setAllAyahs(allAyahsData);
      } else {
         throw new Error('Invalid all ayahs format');
      }
    } catch (err: any) {
      console.error('Error fetching all ayahs:', err);
      // هذا الخطأ أقل حرجية، قد يؤثر فقط على البحث
    }
  };

   // fetchPageContent من الكود الأصلي مع تعديل طفيف للتحقق من surahs
  const fetchPageContent = async (page: number) => {
    setLoading(true);
    setError(null);
    setAyahs([]);
    setCurrentSurahInfo(null);
    setHizbQuarterInfo(null);

    // لا نعتبر عدم تحميل السور خطأ فادحاً هنا، ولكن قد نحتاجها
    if (surahs.length === 0) {
        console.warn("Surah list is not yet available when fetching page content.");
        // قد نحتاج لجلب السور أولاً إذا لم تكن محملة، أو الاعتماد على البيانات المضمنة
        // await fetchSurahs(); // يمكن إضافتها إذا كان ضرورياً الانتظار
    }

    try {
      console.log(`Fetching content for page: ${page}`);
      const response = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);
      if (!response.ok) throw new Error(`فشل الاتصال بالخادم لعرض الصفحة ${page}. الرمز: ${response.status}`);
      const data = await response.json();

      if (data.code === 200 && data.data && Array.isArray(data.data.ayahs)) {
        const ayahsWithSurahInfo = data.data.ayahs.map((ayah: any) => {
           // محاولة إيجاد تفاصيل السورة من القائمة المحملة إن وجدت
           const surahDetail = surahs.find(s => s.number === ayah.surah.number);
           return {
             ...ayah,
             surah: surahDetail || { ...ayah.surah, name: ayah.surah.name.replace(/^\s*/, '').trim() }, // اسم نظيف كاحتياطي
             normalizedText: removeArabicDiacritics(ayah.text),
             hizbQuarter: ayah.hizbQuarter // تأكد من أن الـ API يرجع هذا الحقل
           };
        });
        setAyahs(ayahsWithSurahInfo);

        // تحديث معلومات السورة والجزء وربع الحزب من أول آية إن وجدت
        if(ayahsWithSurahInfo.length > 0) {
            const firstAyah = ayahsWithSurahInfo[0];
            if (firstAyah && firstAyah.surah) {
              // استخدام الاسم النظيف من كائن السورة المرتبط
              setCurrentSurahInfo({ number: firstAyah.surah.number, name: firstAyah.surah.name });
            }
            if (firstAyah && typeof firstAyah.hizbQuarter === 'number') {
                setHizbQuarterInfo(firstAyah.hizbQuarter);
            }
        } else {
             console.log(`Page ${page} loaded successfully but contains no ayahs.`);
             // لا يعتبر خطأ بالضرورة
        }

      } else {
        // رسالة الخطأ من الكود الأصلي
        throw new Error(`استجابة غير متوقعة من الخادم للصفحة ${page}. Code: ${data.code}`);
      }
    } catch (err: any) {
      console.error('Error fetching page content:', err);
      // رسالة الخطأ من الكود الأصلي
      setError(err.message || 'حدث خطأ غير معروف أثناء تحميل محتوى الصفحة.');
      setAyahs([]); // تأكد من إفراغ الآيات عند حدوث خطأ
      setCurrentSurahInfo(null); // إعادة تعيين معلومات السورة
      setHizbQuarterInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // --- دوال التفاعل مع الواجهة (من الكود الأصلي) ---

  const updateTafsirPosition = (element: HTMLElement) => {
    if (!quranContainerRef.current || !tafsirRef.current) return;
    const containerRect = quranContainerRef.current.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const tafsirRect = tafsirRef.current.getBoundingClientRect();
    const ayahCenterX = elementRect.left + (elementRect.width / 2) - containerRect.left;
    const maxX = containerRect.width - tafsirRect.width;
    const x = Math.min(Math.max(0, ayahCenterX - (tafsirRect.width / 2)), maxX);
    const y = elementRect.bottom - containerRect.top + 10;
    setTafsirPosition({ x, y });
  };


  const fetchTafsir = async (ayahNumber: number, element: HTMLSpanElement) => {
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${ayahNumber}/ar.muyassar`);
      const data = await response.json();
      if (data.code === 200) {
        setTafsir({
          text: data.data.text,
          source: 'تفسير الميسر'
        });
        setHoveredAyahRef(element);
        setShowTafsir(true);
      } else {
         console.warn("Tafsir not found or API error:", data);
         setTafsir(null);
         setShowTafsir(false);
      }
    } catch (err) {
      console.error('Error fetching tafsir:', err);
      setTafsir(null);
      setShowTafsir(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= 604 && newPage !== currentPage && !loading) {
      setCurrentPage(newPage);
    }
  };

  // handleSurahSelect من الكود الأصلي
  const handleSurahSelect = async (surahNumber: number) => {
    const selectedSurah = surahs.find(s => s.number === surahNumber);
    if (selectedSurah) {
       setLoading(true);
       try {
         // الكود الأصلي للبحث عن صفحة البداية
         const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:1`);
         const data = await response.json();
         if (data.code === 200 && data.data) {
           handlePageChange(data.data.page);
         } else {
           throw new Error(`Could not fetch first ayah for Surah ${surahNumber}`);
         }
       } catch (err: any) {
         console.error('Error fetching surah start page:', err);
         setError(`لم نتمكن من تحديد صفحة بداية سورة ${selectedSurah.name}. ${err.message}`);
       } finally {
         setLoading(false);
         setShowSurahSelect(false);
       }
    } else {
       setShowSurahSelect(false);
    }
  };

  // handleAyahSelect من الكود الأصلي
  const handleAyahSelect = () => {
     if (!selectedAyah || loading) return;
    const parts = selectedAyah.split(':');
    if (parts.length !== 2) {
        setError("الرجاء إدخال رقم السورة والآية بالشكل الصحيح (مثال: 2:255)");
        return;
    }
    const [surahNumStr, ayahNumStr] = parts;
    const surahNumber = parseInt(surahNumStr);
    const ayahNumberInSurah = parseInt(ayahNumStr);

    if (isNaN(surahNumber) || isNaN(ayahNumberInSurah) || surahNumber < 1 || surahNumber > 114 || ayahNumberInSurah < 1) {
      setError("رقم السورة أو الآية غير صالح.");
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumberInSurah}`)
      .then(res => res.json())
      .then(data => {
        if (data.code === 200 && data.data) {
          const ayahData = data.data;
          handlePageChange(ayahData.page);
          // استخدام setTimeout الأصلي
          setTimeout(() => {
             setHighlightedAyah(ayahData.number);
             scrollToAyah(ayahData.number);
             const indexOnNewPage = ayahs.findIndex(a => a.number === ayahData.number);
             if(indexOnNewPage !== -1) setSelectedAyahIndex(indexOnNewPage);
          }, 700); // التأخير الأصلي
        } else {
           throw new Error(data.error || "لم يتم العثور على الآية المحددة.");
        }
      })
      .catch(err => {
         console.error('Error fetching specific ayah:', err);
         setError(err.message || "حدث خطأ أثناء الانتقال للآية.");
      })
      .finally(() => setLoading(false));
  };

  // handleSearch من الكود الأصلي
  const handleSearch = () => {
     if (!searchQuery.trim() || !fuseSearch || isSearching) return;
    setIsSearching(true);
    setError(null);
    setShowSearchResults(false);

    try {
      const normalizedQuery = removeArabicDiacritics(searchQuery);
      if (fuseSearch) {
          const results = fuseSearch.search(normalizedQuery);
          setSearchResults(results.map(result => ({
            ...result.item,
            matches: result.matches
          })));
          setShowSearchResults(true);
      } else {
         console.warn("Fuse search is not initialized.");
         setError("خاصية البحث غير جاهزة بعد.");
      }
    } catch (err) {
      console.error('Error during search:', err);
      setError('حدث خطأ أثناء عملية البحث.');
    } finally {
      setIsSearching(false);
    }
  };

  // scrollToAyah من الكود الأصلي
  const scrollToAyah = (ayahNumber: number) => {
     setTimeout(() => { // استخدام setTimeout الأصلي
        const ayahElement = ayahRefs.current[ayahNumber];
        if (ayahElement) {
          ayahElement.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
           console.warn(`Element for ayah ${ayahNumber} not found in refs.`);
        }
     }, 100); // التأخير الأصلي
  };

  // handleSearchResultClick من الكود الأصلي
  const handleSearchResultClick = (result: SearchResult) => {
    handlePageChange(result.page);
    setShowSearchResults(false);
    // استخدام setTimeout الأصلي
    setTimeout(() => {
      setHighlightedAyah(result.number);
      scrollToAyah(result.number);
       const indexOnNewPage = ayahs.findIndex(a => a.number === result.number);
       if(indexOnNewPage !== -1) setSelectedAyahIndex(indexOnNewPage);
    }, 700); // التأخير الأصلي
  };

  // handleAyahClick من الكود الأصلي
 const handleAyahClick = async (ayahNumber: number, element: HTMLSpanElement) => {
    if (loading) return;

    if (selectedAyahNumber === ayahNumber) {
      setSelectedAyahNumber(null);
      setShowTafsir(false);
      setHighlightAnimation(null);
      // لا يتم إعادة تعيين selectedAyahIndex هنا في الكود الأصلي
      return;
    }

    setHighlightAnimation(ayahNumber);

    // استخدام setTimeout الأصلي
    setTimeout(() => {
      setSelectedAyahNumber(ayahNumber);
      const ayahNumberElement = element.querySelector('.ayah-number');
      if (ayahNumberElement) {
        updateTafsirPosition(ayahNumberElement as HTMLElement);
      } else {
        updateTafsirPosition(element);
      }
      fetchTafsir(ayahNumber, element);
      const clickedIndex = ayahs.findIndex(a => a.number === ayahNumber);
      if(clickedIndex !== -1) setSelectedAyahIndex(clickedIndex);
    }, 100); // التأخير الأصلي
 };


  // closeTafsir من الكود الأصلي
  const closeTafsir = () => {
    setShowTafsir(false);
    setSelectedAyahNumber(null);
    // لا يتم تعديل highlightAnimation أو selectedAyahIndex هنا في الكود الأصلي
  };

  // --- *** حساب المتغيرات للعرض (مع إضافة shouldDisplayBasmala) *** ---
  const shouldDisplayBasmala = ayahs.length > 0
                               && ayahs[0].numberInSurah === 1 // هي الآية الأولى في السورة
                               && ayahs[0].surah?.number !== 9 // ليست سورة التوبة
                               && ayahs[0].surah?.number !== 1; // ليست سورة الفاتحة

  const juzNumber = ayahs[0]?.juz;
  const surahDisplayName = currentSurahInfo?.name; // الاسم النظيف (من الكود الأصلي)
  const surahDisplayNumber = currentSurahInfo?.number;


  // --- العرض (Render) - من الكود الأصلي مع تعديل عرض الآيات والبسملة ---
  return (
    <div className="space-y-6 md:space-y-8">
      {/* رأس التطبيق (من الكود الأصلي) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Book className="w-8 h-8 text-amber-400" />
          <div><h2 className="text-2xl font-bold text-white font-naskh">القرآن الكريم</h2></div>
        </div>
        <motion.button
           whileHover={{ scale: 1.05 }}
           whileTap={{ scale: 0.95 }}
           onClick={onShowProgress}
           className="px-4 py-2 rounded-lg bg-[#2D1B69]/50 text-white hover:bg-[#2D1B69] transition-colors flex items-center gap-2"
        >
          <BarChart2 className="w-5 h-5 text-amber-400" />
          <span className="hidden md:inline font-naskh">عرض التقدم</span>
        </motion.button>
      </div>

      {/* اختيار السورة والانتقال للآية (من الكود الأصلي) */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {/* اختيار السورة (من الكود الأصلي) */}
         <div className="relative">
           <motion.button
             whileHover={{ scale: 1.02 }}
             onClick={() => setShowSurahSelect(!showSurahSelect)}
             disabled={loading || surahs.length === 0}
             className={`w-full px-4 py-3 bg-[#2D1B69]/30 rounded-lg text-white flex items-center justify-between hover:bg-[#2D1B69]/50 transition-colors ${loading || surahs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             {/* العرض الأصلي مع إضافة "سورة " */}
             <span className="font-naskh">
                {surahDisplayName ? `  ${surahDisplayName}` : (loading ? 'جار التحميل...' : 'اختر السورة')}
             </span>
             <ChevronDown className={`w-5 h-5 text-amber-400 transition-transform ${showSurahSelect ? 'rotate-180' : ''}`} />
           </motion.button>
           <AnimatePresence>
             {showSurahSelect && surahs.length > 0 && (
               <motion.div
                 initial={{ opacity: 0, y: -10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="absolute top-full left-0 right-0 mt-2 bg-[#1A0F3C] rounded-lg shadow-lg border border-purple-500/20 z-20 max-h-60 md:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400/50 scrollbar-track-transparent"
               >
                 {surahs.map((surah) => (
                   <motion.button
                     key={surah.number}
                     whileHover={{ backgroundColor: 'rgba(45, 27, 105, 0.7)' }}
                     onClick={() => handleSurahSelect(surah.number)}
                     className="w-full p-3 text-right text-white hover:bg-[#2D1B69]/70 border-b border-purple-500/20 font-naskh last:border-b-0"
                   >
                     {/* عرض الاسم النظيف الأصلي */}
                     {surah.number}. {surah.name}
                   </motion.button>
                 ))}
               </motion.div>
             )}
           </AnimatePresence>
         </div>
          {/* الانتقال لآية محددة (من الكود الأصلي) */}
         <div className="flex gap-2 md:gap-4">
           <input
             type="text"
             value={selectedAyah}
             onChange={(e) => setSelectedAyah(e.target.value)}
             placeholder="السورة:الآية (مثل 2:255)"
             disabled={loading}
             className={`flex-1 px-3 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-naskh text-sm md:text-base ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
             dir="ltr"
             style={{ textAlign: 'right' }}
             />
           <motion.button
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={handleAyahSelect}
             disabled={loading || !selectedAyah.includes(':')}
             className={`px-4 md:px-6 py-3 rounded-lg bg-[#2D1B69] text-white hover:bg-[#3D2B79] transition-colors flex items-center gap-2 ${loading || !selectedAyah.includes(':') ? 'opacity-50 cursor-not-allowed' : ''}`}
             >
             <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
             <span className="font-naskh text-sm md:text-base">انتقال</span>
           </motion.button>
         </div>
       </div>

      {/* البحث (من الكود الأصلي) */}
      <div className="relative">
          <div className="flex gap-2 md:gap-4">
             <div className="relative flex-1">
               <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 w-5 h-5 pointer-events-none" />
               <input
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                 placeholder="ابحث في نص القرآن..."
                 disabled={isSearching || allAyahs.length === 0 || loading}
                 className={`w-full pl-4 pr-10 md:pr-12 py-3 bg-[#2D1B69]/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-amber-400 font-naskh ${isSearching || allAyahs.length === 0 || loading ? 'opacity-50 cursor-not-allowed' : ''}`}
               />
             </div>
             <motion.button
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               onClick={handleSearch}
               disabled={isSearching || !searchQuery.trim() || allAyahs.length === 0 || loading}
               className={`px-4 md:px-6 py-3 rounded-lg ${isSearching || !searchQuery.trim() || allAyahs.length === 0 || loading ? 'bg-[#2D1B69]/50 cursor-not-allowed' : 'bg-[#2D1B69] hover:bg-[#3D2B79]'} text-white transition-colors flex items-center gap-2`}
             >
               {isSearching ? (
                 <>
                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                   <span className="font-naskh text-sm md:text-base">جارٍ البحث...</span>
                 </>
               ) : (
                 <>
                   <Search className="w-4 h-4 md:w-5 md:h-5" />
                   <span className="font-naskh text-sm md:text-base">بحث</span>
                 </>
               )}
             </motion.button>
           </div>
           {/* عرض نتائج البحث (من الكود الأصلي) */}
           <AnimatePresence>
             {showSearchResults && (
               <motion.div
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="absolute top-full left-0 right-0 mt-2 bg-[#1A0F3C] rounded-lg shadow-lg border border-purple-500/20 z-10 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-400/50 scrollbar-track-transparent"
               >
                 {searchResults.length > 0 ? (
                   searchResults.map((result, index) => (
                     <div
                       key={`${result.number}-${index}`}
                       className="p-3 md:p-4 border-b border-purple-500/20 hover:bg-[#2D1B69]/70 cursor-pointer transition-colors"
                       onClick={() => handleSearchResultClick(result)}
                     >
                       <div className="flex justify-between items-center mb-1 text-xs md:text-sm">
                         <div className="text-amber-400 font-naskh">
                           {/* عرض اسم السورة النظيف الأصلي */}
                            {result.surah?.name || `رقم ${result.surah?.number || '؟'}`} - آية {result.numberInSurah}
                         </div>
                         <div className="text-purple-300 font-naskh">
                           ص {result.page} - ج {result.juz}
                         </div>
                       </div>
                       <div className="text-white font-amiri text-base md:text-lg leading-relaxed" dir="rtl">
                          {result.text}
                       </div>
                     </div>
                   ))
                 ) : ( searchQuery.trim() && !isSearching && (
                         <div className="p-4 text-center text-purple-300 font-naskh">
                           لم يتم العثور على نتائج للبحث عن "{searchQuery}"
                         </div>
                     )
                 )}
               </motion.div>
             )}
           </AnimatePresence>
         </div>

      {/* ----- عرض محتوى الصفحة (من الكود الأصلي مع تعديل عرض الآيات والبسملة) ----- */}
      <div className="bg-[#1e124a]/60 backdrop-blur-lg rounded-xl p-4 md:p-6 shadow-lg border border-purple-500/10">
        {/* حالة التحميل (من الكود الأصلي) */}
        {loading && (
          <div className="flex flex-col items-center justify-center h-[400px] md:h-[600px]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-400 border-t-transparent mb-4"></div>
            <p className="text-purple-300 font-naskh">جارٍ تحميل صفحة {currentPage}...</p>
          </div>
        )}
        {/* حالة الخطأ (من الكود الأصلي) */}
        {!loading && error && (
            <div className="flex flex-col items-center justify-center h-[400px] md:h-[600px] text-center px-4">
                 <X className="w-12 h-12 text-red-400 mb-4" />
                 <h3 className="text-xl font-bold text-red-400 font-naskh mb-2">حدث خطأ!</h3>
                <p className="text-purple-200 font-naskh max-w-md">{error}</p>
                 <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => fetchPageContent(currentPage)}
                    className="mt-6 px-6 py-2 rounded-lg bg-amber-500 text-[#1A0F3C] hover:bg-amber-400 transition-colors font-naskh font-semibold"
                 >
                     إعادة المحاولة
                 </motion.button>
            </div>
        )}

        {/* عرض المحتوى (من الكود الأصلي مع تعديل عرض الآيات والبسملة) */}
        {!loading && !error && (
          <>
            {/* معلومات أعلى الصفحة (من الكود الأصلي) */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4 md:mb-6 px-2 border-b border-purple-500/10 pb-3">
              {/* معلومات السورة والجزء (من الكود الأصلي) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm md:text-base text-purple-300 font-naskh order-2 md:order-1">
                 {/* الكود الأصلي لعرض السورة */}
                 {surahDisplayName && surahDisplayNumber ? (
                     <span className="bg-[#1A0F3C]/50 px-3 py-1 rounded-full border border-purple-500/20 whitespace-nowrap">
                            {surahDisplayName} ({surahDisplayNumber}) {/* إضافة "سورة " الأصلية */}
                     </span>
                  ) : null }

                 {/* فواصل وعرض الجزء والصفحة وربع الحزب (من الكود الأصلي) */}
                 {juzNumber && <span className="text-purple-500">|</span>}
                 {juzNumber && <span className="whitespace-nowrap">الجزء {juzNumber}</span>}
                 <span className="text-purple-500">|</span>
                 <span className="whitespace-nowrap">صفحة {currentPage}</span>
                 {hizbQuarterInfo && (
                   <>
                     <span className="text-purple-500">|</span>
                     <span className="flex items-center gap-1 bg-[#1A0F3C]/50 px-2 py-1 rounded-full border border-purple-500/20 whitespace-nowrap" title={`ربع الحزب ${hizbQuarterInfo}`}>
                       <span className="text-lg text-amber-400 relative -top-0.5" aria-hidden="true">۞</span>
                       <span>{hizbQuarterInfo}</span>
                     </span>
                   </>
                 )}
              </div>
              {/* زر الحفظ (من الكود الأصلي) */}
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => markPageCompleted(currentPage, !isPageCompleted)}
                className={`order-1 md:order-2 px-3 py-1 md:px-4 md:py-2 rounded-lg flex items-center gap-2 text-xs md:text-sm font-naskh transition-colors whitespace-nowrap ${
                  isPageCompleted ? 'bg-green-600/80 hover:bg-green-500/80 text-white' : 'bg-[#2D1B69]/70 hover:bg-[#3D2B79]/80 text-white'
                }`}
              >
                <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
                {isPageCompleted ? 'تم حفظ الصفحة' : 'حفظ كـ مقروءة'}
              </motion.button>
            </div>

            {/* حاوية النص القرآني (من الكود الأصلي مع تعديل عرض الآيات والبسملة) */}
            <div
              ref={quranContainerRef} // الـ ref الأصلي
              className="bg-[#1A0F3C]/70 rounded-lg p-4 md:p-8 mb-6 relative min-h-[400px] md:min-h-[600px] border border-purple-800/30 shadow-inner" // الكلاسات الأصلية
              style={{ direction: 'rtl' }} // الـ style الأصلي
            >
               {/* *** عرض البسملة المنفصلة (الكود المضاف) *** */}
                {shouldDisplayBasmala && (
                   <div
                      className="basmala text-center text-xl md:text-2xl text-amber-300 font-amiri font-bold py-4 mb-4 border-b border-amber-500/20"
                      aria-label="بسم الله الرحمن الرحيم"
                      >
                       بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                   </div>
                 )}

              {/* عرض الآيات (من الكود الأصلي مع تعديل النص المعروض) */}
              {ayahs.length > 0 ? (
                 <div className="quran-text text-lg md:text-xl lg:text-2xl leading-loose md:leading-loose lg:leading-loose font-amiri text-gray-100 selection:bg-amber-400/30">
                   {ayahs.map((ayah, index) => {
                      // *** الكود المضاف لمعالجة البسملة المزدوجة ***
                     let ayahDisplayText = ayah.text;
                     if (index === 0 && shouldDisplayBasmala) {
                       const basmalaString = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
                       if (ayah.text.trim().startsWith(basmalaString)) {
                            ayahDisplayText = ayah.text.trim().slice(basmalaString.length).trim();
                            if (!ayahDisplayText) ayahDisplayText = "";
                       } else {
                           console.warn(`Expected Basmala at the start of Ayah ${ayah.numberInSurah} (Surah ${ayah.surah.number}) but not found. Text:`, ayah.text);
                       }
                     }

                     return (
                       <span
                         key={ayah.number}
                         id={`ayah-${ayah.number}`}
                         ref={(el) => { ayahRefs.current[ayah.number] = el; }}
                         onClick={(e) => handleAyahClick(ayah.number, e.currentTarget)}
                         // الكلاس الأصلي لتحديد السهم
                         className={`inline relative ayah-outer-span ${selectedAyahIndex === index ? 'ring-2 ring-amber-400 outline-offset-2 rounded-lg' : ''}`}
                         aria-label={`الآية ${ayah.numberInSurah} من سورة ${ayah.surah?.name || '؟'}`}
                       >
                         <motion.span
                           // الكلاسات الأصلية للتظليل والأنيميشن
                           className={`inline transition-colors duration-300 cursor-pointer rounded-lg px-1
                           ${selectedAyahNumber === ayah.number
                             ? 'text-amber-400 bg-amber-400/20' // التظليل الأصلي للآية المحددة
                             : highlightedAyah === ayah.number
                             ? 'text-white bg-amber-500/30' // التظليل الأصلي المؤقت
                             : 'text-white hover:text-amber-400/80'} // التظليل الأصلي عند المرور
                           ${highlightAnimation === ayah.number ? 'ayah-highlight' : ''}`} // الأنيميشن الأصلي
                           animate={{ // animate الأصلي
                             backgroundColor: selectedAyahNumber === ayah.number
                               ? 'rgba(245, 158, 11, 0.2)'
                               : highlightedAyah === ayah.number
                               ? 'rgba(245, 158, 11, 0.3)'
                               : 'transparent'
                           }}
                           transition={{ duration: 0.3 }} // transition الأصلي
                         >
                            {/* *** استخدام النص المُعدل هنا *** */}
                           {ayahDisplayText}
                           <span className="inline-block mx-2 text-amber-400 text-[22px] ayah-number select-none">
                               ﴿{ayah.numberInSurah}﴾
                           </span>
                         </motion.span>
                         {index < ayahs.length - 1 && ' '}
                       </span>
                     );
                   })}
                 </div>
               ) : ( <div className="text-center text-purple-300 font-naskh py-10">لا توجد آيات لعرضها في هذه الصفحة.</div> )}

               {/* عرض التفسير (بالتصميم الأصلي) */}
               <AnimatePresence>
                {showTafsir && tafsir && (
                  <motion.div
                    ref={tafsirRef}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    // style الأصلي للموقع
                    style={{ position: 'absolute', left: tafsirPosition.x, top: tafsirPosition.y, maxWidth: '400px', zIndex: 50 }}
                    className="bg-[#1A0F3C] p-4 rounded-xl shadow-lg border border-amber-500/20 tafsir-card" // الكلاسات الأصلية
                    role="tooltip" id="tafsir-tooltip"
                  >
                    {/* رأس التفسير الأصلي */}
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-bold text-amber-400 font-naskh">{tafsir.source}</h3>
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={closeTafsir} className="p-1 rounded-full hover:bg-purple-800/50 text-purple-300" aria-label="إغلاق التفسير" aria-controls="tafsir-tooltip">
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                    {/* نص التفسير الأصلي */}
                    <p className="text-white text-base font-naskh leading-relaxed max-h-48 overflow-y-auto scrollbar-thin" dir="rtl">
                      {tafsir.text}
                    </p>
                    {/* السهم الأصلي */}
                    <div className="absolute w-4 h-4 bg-[#1A0F3C] transform rotate-45 border-t border-r border-amber-500/20" style={{ top: '-8px', left: '50%', marginLeft: '-8px' }} aria-hidden="true" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

             {/* أزرار التنقل بين الصفحات (من الكود الأصلي) */}
            <div className="flex items-center justify-between mt-6">
              {/* زر الصفحة السابقة (الأصلي) */}
              <motion.button
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 font-naskh text-sm md:text-base transition-colors ${
                  currentPage <= 1 || loading ? 'bg-[#1A0F3C]/50 text-purple-400 cursor-not-allowed' : 'bg-[#1A0F3C]/80 text-white hover:bg-[#2D1B69]/80'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
                السابقة
              </motion.button>

              {/* إدخال رقم الصفحة (الأصلي) */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="604"
                  defaultValue={currentPage} // defaultValue الأصلي
                  key={currentPage} // key الأصلي
                  onBlur={(e) => { // onBlur الأصلي
                      const num = parseInt(e.target.value);
                      if (!isNaN(num) && num >= 1 && num <= 604) { handlePageChange(num); }
                      else { e.target.value = currentPage.toString(); }
                   }}
                   onKeyPress={(e) => { // onKeyPress الأصلي
                        if (e.key === 'Enter') {
                            const num = parseInt((e.target as HTMLInputElement).value);
                             if (!isNaN(num) && num >= 1 && num <= 604) {
                                handlePageChange(num);
                                (e.target as HTMLInputElement).blur();
                            }
                        }
                   }}
                  disabled={loading}
                  className={`w-16 md:w-20 px-2 py-2 bg-[#1A0F3C]/80 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-400 font-naskh ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="رقم الصفحة الحالي"
                />
                <span className="text-purple-300 font-naskh text-sm md:text-base">/ 604</span>
              </div>

              {/* زر الصفحة التالية (الأصلي) */}
              <motion.button
                whileHover={{ scale: 1.05, x: 3 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= 604 || loading}
                 className={`px-4 py-2 rounded-lg flex items-center gap-2 font-naskh text-sm md:text-base transition-colors ${
                  currentPage >= 604 || loading ? 'bg-[#1A0F3C]/50 text-purple-400 cursor-not-allowed' : 'bg-[#1A0F3C]/80 text-white hover:bg-[#2D1B69]/80'
                }`}
              >
                التالية
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
            </div>
          </>
        )}
      </div>
       {/* إضافة style الأصلي للأنيميشن إذا كان موجوداً */}
       <style jsx global>{`
        /* تأكد من أن هذا الكلاس يطابق ما استخدمته في الكود الأصلي */
        .ayah-highlight {
           /* يمكنك وضع تعريف الأنيميشن الأصلي هنا إذا كان مختلفًا */
           /* مثال: animation: pulse-highlight 1.5s ease-out; */
           /* إذا لم يكن هناك أنيميشن محدد بكلاس، يمكن إزالة هذا الجزء */
        }
        @keyframes pulse-highlight {
           /* تعريف الأنيميشن الأصلي إذا كان موجودًا */
          0% { background-color: transparent; }
          50% { background-color: rgba(245, 158, 11, 0.4); }
          100% { background-color: transparent; }
        }

        /* يمكنك إضافة أي ستايلات أخرى كانت موجودة في الكود الأصلي هنا */
        /* .scrollbar-thin ... etc */

      `}</style>
    </div>
  );
};