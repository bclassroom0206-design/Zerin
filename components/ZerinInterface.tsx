
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { queryZerinBrain } from '../services/geminiService';
import { authService, User } from '../services/authService';

enum AnimationState {
  SILENT = 'silent',
  THINK = 'think',
  SPEAK = 'speak'
}

enum AppView {
  AUTH = 'auth',
  PIN_ENTRY = 'pin_entry',
  MAIN = 'main',
  ADMIN = 'admin',
  USER_PANEL = 'user_panel'
}

enum AdminSubView {
  VITALS = 'vitals',
  COGNITIVE = 'cognitive',
  POPULATION = 'population',
  FINANCIALS = 'financials',
  PERSONA = 'persona',
  KNOWLEDGE = 'knowledge'
}

enum UserSubView {
  DAILY_TASKS = 'daily_tasks',
  SCHEDULE = 'schedule',
  MEETINGS = 'meetings',
  DAILY_NOTES = 'daily_notes'
}

const ZerinInterface: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.AUTH);
  const [adminSubView, setAdminSubView] = useState<AdminSubView>(AdminSubView.VITALS);
  const [userSubView, setUserSubView] = useState<UserSubView>(UserSubView.DAILY_TASKS);
  const [financialsTab, setFinancialsTab] = useState<'GATEWAYS' | 'TIERS'>('GATEWAYS');
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [animState, setAnimState] = useState<AnimationState>(AnimationState.SILENT);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [isAvatarVisible, setIsAvatarVisible] = useState(true);
  const [detectedObjects, setDetectedObjects] = useState<{name: string, confidence: number}[]>([]);
  const [isTriggerSuccess, setIsTriggerSuccess] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'zerin', text: string, image?: string }[]>([]);
  const [displayMessage, setDisplayMessage] = useState('AWAITING NEURAL LINK...');

  // Admin Population States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ name: '', email: '', pin: '', mobile: '', tier: 'FREE' as User['tier'] });

  // Admin Financials States
  const [gateways, setGateways] = useState({
    stripe: { active: true, status: 'CONNECTED' },
    bkash: { active: true, status: 'CONNECTED' },
    paypal: { active: false, status: 'DISCONNECTED' }
  });

  const [tierMatrix, setTierMatrix] = useState([
    { id: 'FREE', price: '$0', tokens: '10K', features: ['Standard LLM', 'Text Mode', 'Basic Vision'] },
    { id: 'PRO', price: '$29', tokens: 'Unlimited', features: ['Advanced LLM', 'Voice Mode', 'Video Vision', 'Daily Records'] },
    { id: 'ENTERPRISE', price: '$99', tokens: 'Custom', features: ['Private Core', 'Dedicated LLM', 'Full Neural Link', 'Admin Hub Access'] }
  ]);

  // Admin Knowledge Base States
  const [knowledgeSources, setKnowledgeSources] = useState<{id: string, name: string, type: string, status: string, link: string}[]>([
    { id: '1', name: 'Internal Protocol Alpha', type: 'PDF', status: 'INDEXED', link: '#' },
    { id: '2', name: 'Project Timeline', type: 'GOOGLE SHEETS', status: 'SYNCED', link: '#' }
  ]);
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({ name: '', type: 'PDF', link: '' });

  // User Panel States
  const [tasks, setTasks] = useState<{id: string, desc: string, freq: string}[]>([]);
  const [schedules, setSchedules] = useState<{id: string, title: string, date: string, time: string, details: string}[]>([]);
  const [meetings, setMeetings] = useState<{id: string, title: string, date: string, time: string, details: string}[]>([]);
  const [notes, setNotes] = useState<{id: string, title: string, content: string}[]>([]);

  // Form States for User Panel
  const [taskForm, setTaskForm] = useState({ desc: '', freq: 'DAILY' });
  const [eventForm, setEventForm] = useState({ title: '', date: '', time: '', details: '' });
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });

  // Persona State
  const [personaConfig, setPersonaConfig] = useState({
    name: 'ZERIN',
    tone: 'PROFESSIONAL',
    language: 'BENGALI',
    systemInstruction: `You are Zerin, a highly intelligent and professional virtual assistant. 
Personality: Courteous, futuristic, and efficient. 
MANDATORY RULE: Never use the word "নমস্কার" (Namaskar). Instead, use "Hello sir" or "আসসালামু আলাইকুম" where appropriate.
Constraint: Keep responses concise and meaningful.`
  });

  const [uploadType, setUploadType] = useState<'chat' | 'silent' | 'think' | 'speak' | null>(null);

  // LLM Config State
  const [llmConfigs, setLlmConfigs] = useState([
    { id: 'gemini', name: 'GEMINI (GOOGLE)', status: 'PRIMARY COGNITION', key: '••••••••••••', inUse: true },
    { id: 'gpt4', name: 'GPT-4 (OPENAI)', status: 'STANDBY ENGINE', key: '••••••••••••', inUse: false },
    { id: 'claude', name: 'CLAUDE (ANTHROPIC)', status: 'STANDBY ENGINE', key: '••••••••••••', inUse: false },
    { id: 'deepseek', name: 'DEEPSEEK', status: 'STANDBY ENGINE', key: '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', inUse: false }
  ]);

  // Auth States
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  // Zerin Settings
  const [zerinVideos, setZerinVideos] = useState({
    silent: 'assets/silent.mp4#t=1',
    think: 'assets/think.mp4',
    speak: 'assets/speak.mp4'
  });

  const silentRef = useRef<HTMLVideoElement>(null);
  const thinkRef = useRef<HTMLVideoElement>(null);
  const speakRef = useRef<HTMLVideoElement>(null);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const visionModelRef = useRef<any>(null);

  // Attribution
  const EID = 'ZGV2LWF0dHJpYnV0aW9u';
  const CTX = 'RGV2ZWxvcGVkIEJ5IEpSUlRlY2g=';
  const URL = 'aHR0cHM6Ly9qcnJ0ZWNoLmNvbS8=';

  const setupAttribution = useCallback(() => {
    const elId = atob(EID);
    const text = atob(CTX);
    const href = atob(URL);
    const element = document.getElementById(elId);
    if (element && !element.querySelector('a')) {
      const a = document.createElement('a');
      a.href = href;
      a.textContent = text;
      a.target = "_blank";
      a.className = "text-[10px] text-cyan-400 opacity-30 hover:opacity-100 transition-opacity uppercase tracking-widest";
      element.appendChild(a);
    }
  }, []);

  const checkAttribution = useCallback(() => {
    const elId = atob(EID);
    const text = atob(CTX);
    const href = atob(URL);
    const element = document.getElementById(elId);
    if (!element) return;
    const anchor = element.querySelector('a');
    if (!anchor || anchor.href !== href || anchor.textContent !== text) {
      document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 20%; font-family: Orbitron;">Tampering is not allowed</h1>';
    }
  }, []);

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setView(AppView.PIN_ENTRY);
    }
    const storedZerin = localStorage.getItem('zerin_config');
    if (storedZerin) setZerinVideos(JSON.parse(storedZerin));
    
    const storedPersona = localStorage.getItem('zerin_persona');
    if (storedPersona) setPersonaConfig(JSON.parse(storedPersona));

    setupAttribution();
    const interval = setInterval(() => {
        setupAttribution();
        checkAttribution();
    }, 5000);
    return () => clearInterval(interval);
  }, [checkAttribution, setupAttribution]);

  const saveZerinConfig = (updates: Partial<typeof zerinVideos>) => {
    const newConfig = { ...zerinVideos, ...updates };
    setZerinVideos(newConfig);
    localStorage.setItem('zerin_config', JSON.stringify(newConfig));
    speak("Hello sir, Avatar media configuration has been updated in the memory core.");
  };

  const savePersonaConfig = (updates: Partial<typeof personaConfig>) => {
    const newConfig = { ...personaConfig, ...updates };
    setPersonaConfig(newConfig);
    localStorage.setItem('zerin_persona', JSON.stringify(newConfig));
    speak(`Hello sir, Neural identity protocols for ${newConfig.name} have been committed.`);
  };

  const triggerSuccessVisual = () => {
    setIsTriggerSuccess(false);
    requestAnimationFrame(() => {
      setIsTriggerSuccess(true);
      setTimeout(() => setIsTriggerSuccess(false), 700);
    });
  };

  const speak = (text: string) => {
    const filteredText = text.replace(/নমস্কার/g, "Hello sir");
    triggerSuccessVisual();
    setDisplayMessage(filteredText);
    setChatHistory(prev => [...prev, { role: 'zerin', text: filteredText }]);
    setAnimState(AnimationState.SPEAK);
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(filteredText);
    utterance.lang = personaConfig.language === 'BENGALI' ? 'bn-BD' : 'en-US';
    utterance.onend = () => {
      setAnimState(AnimationState.SILENT);
      if (!isVideoCallActive) startRecognition();
    };
    synth.speak(utterance);
  };

  const startRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecognitionActive(true);
        setDisplayMessage('LISTENING...');
      } catch (e) { console.warn(e); }
    }
  };

  const toggleVideoCall = async (forceState?: boolean) => {
    const targetState = forceState !== undefined ? forceState : !isVideoCallActive;
    if (targetState) {
      speak('Hello sir, ভিডিও কল মোড চালু হচ্ছে।');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (userVideoRef.current) {
          userVideoRef.current.srcObject = stream;
          setIsVideoCallActive(true);
        }
      } catch (err) { speak('Hello sir, ক্যামেরা চালু করতে সমস্যা হচ্ছে।'); }
    } else {
      speak('Hello sir, ভিডিও কল মোড বন্ধ করা হয়েছে।');
      const stream = userVideoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
      setIsVideoCallActive(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (uploadType === 'chat') {
          setSelectedImage(dataUrl);
          triggerSuccessVisual();
        } else if (uploadType === 'silent') {
          saveZerinConfig({ silent: dataUrl });
        } else if (uploadType === 'think') {
          saveZerinConfig({ think: dataUrl });
        } else if (uploadType === 'speak') {
          saveZerinConfig({ speak: dataUrl });
        }
        setUploadType(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCommand = async (command: string, image?: string) => {
    const finalCommand = command.trim() || (image ? "এই ছবিটির বিশ্লেষণ করুন।" : "");
    if (!finalCommand) return;
    setChatHistory(prev => [...prev, { role: 'user', text: finalCommand, image }]);
    setDisplayMessage(finalCommand.toUpperCase());
    setSelectedImage(null);
    setAnimState(AnimationState.THINK);
    
    const aiResponse = await queryZerinBrain(
      finalCommand, 
      detectedObjects.map(o => o.name), 
      image,
      personaConfig.systemInstruction
    );
    speak(aiResponse);
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onresult = (e: any) => handleCommand(e.results[0][0].transcript);
      recognitionRef.current.onend = () => setIsRecognitionActive(false);
    }
    const loadVision = async () => {
      if ((window as any).cocoSsd) {
        visionModelRef.current = await (window as any).cocoSsd.load();
      } else { setTimeout(loadVision, 1000); }
    };
    loadVision();
  }, []);

  useEffect(() => {
    let frameId: number;
    const runDetection = async () => {
      if (isVideoCallActive && userVideoRef.current && visionModelRef.current) {
        try {
          const predictions = await visionModelRef.current.detect(userVideoRef.current);
          setDetectedObjects(predictions.map((p: any) => ({ name: p.class, confidence: Math.round(p.score * 100) })));
        } catch (e) { }
      }
      frameId = requestAnimationFrame(runDetection);
    };
    if (isVideoCallActive) runDetection();
    return () => cancelAnimationFrame(frameId);
  }, [isVideoCallActive]);

  const handleAuth = () => {
    setError('');
    if (authMode === 'register') {
      if (!email || !password || !pin || !mobile || !name) {
        setError('সব ফিল্ড পূরণ করুন');
        return;
      }
      if (pin.length !== 4) {
        setError('পিন অবশ্যই ৪ ডিজিটের হতে হবে');
        return;
      }
      const user = authService.register({ email, password, pin, mobile, name });
      authService.setCurrentUser(user);
      setCurrentUser(user);
      setView(AppView.PIN_ENTRY);
    } else {
      const user = authService.login(email, password, pin);
      if (user) {
        authService.setCurrentUser(user);
        setCurrentUser(user);
        if (loginMethod === 'pin') {
            setView(AppView.MAIN);
            speak(`Hello sir! স্বাগতম ${user.name}! আমি ${personaConfig.name}। আপনাকে কিভাবে সাহায্য করতে পারি?`);
        } else {
            setView(AppView.PIN_ENTRY);
        }
      } else {
        setError(loginMethod === 'password' ? 'ইমেইল বা পাসওয়ার্ড ভুল' : 'ইমেইল বা পিন ভুল');
      }
    }
  };

  const handlePinSubmit = () => {
    if (authService.verifyPin(pin)) {
      setView(AppView.MAIN);
      setPin('');
      speak(`Hello sir! স্বাগতম ${currentUser?.name}! আমি ${personaConfig.name}। আপনাকে কিভাবে সাহায্য করতে পারি?`);
    } else {
      setError('ভুল পিন নম্বর। আবার চেষ্টা করুন।');
      setPin('');
    }
  };

  const handleLogout = () => {
    authService.setCurrentUser(null);
    setCurrentUser(null);
    setView(AppView.AUTH);
  };

  const clearChat = () => {
    setChatHistory([]);
    setDisplayMessage('HISTORY CLEARED.');
    triggerSuccessVisual();
    speak("Hello sir, dialogue history purged.");
  };

  const deployLLM = (id: string) => {
    setLlmConfigs(prev => prev.map(cfg => ({
      ...cfg,
      inUse: cfg.id === id
    })));
    triggerSuccessVisual();
    speak(`Hello sir! ${id.toUpperCase()} cognitive engine has been deployed as the primary neural link.`);
  };

  const handleEnrollment = () => {
    if (!enrollForm.name || !enrollForm.email || !enrollForm.pin) {
        speak("Hello sir, please fill all neural enrollment fields.");
        return;
    }
    authService.register({ 
        name: enrollForm.name, 
        email: enrollForm.email, 
        pin: enrollForm.pin, 
        mobile: enrollForm.mobile,
        tier: enrollForm.tier,
        status: 'ACTIVE'
    });
    setEnrollForm({ name: '', email: '', pin: '', mobile: '', tier: 'FREE' });
    setShowEnrollmentForm(false);
    triggerSuccessVisual();
    speak(`Hello sir, subject ${enrollForm.name.toUpperCase()} has been successfully enrolled in the core database.`);
  };

  const toggleGateway = (id: keyof typeof gateways) => {
    setGateways(prev => ({
        ...prev,
        [id]: { 
            ...prev[id], 
            active: !prev[id].active,
            status: !prev[id].active ? 'CONNECTED' : 'DISCONNECTED'
        }
    }));
    triggerSuccessVisual();
    speak(`Hello sir, ${String(id).toUpperCase()} payment node has been ${!gateways[id].active ? 're-established' : 'decoupled'}.`);
  };

  const handleKnowledgeEntry = () => {
    if (!knowledgeForm.name || !knowledgeForm.link) {
      speak("Hello sir, source parameters must be defined before indexing.");
      return;
    }
    const newSource = {
      id: Date.now().toString(),
      ...knowledgeForm,
      status: 'INDEXING'
    };
    setKnowledgeSources([...knowledgeSources, newSource]);
    setShowKnowledgeForm(false);
    setKnowledgeForm({ name: '', type: 'PDF', link: '' });
    triggerSuccessVisual();
    speak(`Hello sir, the ${newSource.type} resource is being assimilated into the knowledge core.`);
    setTimeout(() => {
      setKnowledgeSources(prev => prev.map(s => s.id === newSource.id ? { ...s, status: 'INDEXED' } : s));
    }, 3000);
  };

  const deleteKnowledgeSource = (id: string) => {
    setKnowledgeSources(knowledgeSources.filter(s => s.id !== id));
    triggerSuccessVisual();
    speak("Hello sir, source link has been purged from the knowledge core.");
  };

  const addRecord = () => {
    triggerSuccessVisual();
    if (userSubView === UserSubView.DAILY_TASKS && taskForm.desc) {
      setTasks([...tasks, { id: Date.now().toString(), ...taskForm }]);
      setTaskForm({ desc: '', freq: 'DAILY' });
      speak(`Hello sir! নতুন টাস্ক মেমোরি কোরে যোগ করা হয়েছে।`);
    } else if (userSubView === UserSubView.SCHEDULE && eventForm.title) {
      setSchedules([...schedules, { id: Date.now().toString(), ...eventForm }]);
      setEventForm({ title: '', date: '', time: '', details: '' });
      speak(`Hello sir! নতুন ইভেন্ট শিডিউলে সেট করা হয়েছে।`);
    } else if (userSubView === UserSubView.MEETINGS && eventForm.title) {
      setMeetings([...meetings, { id: Date.now().toString(), ...eventForm }]);
      setEventForm({ title: '', date: '', time: '', details: '' });
      speak(`Hello sir! মিটিং প্রোটোকল এন্ট্রি সম্পন্ন হয়েছে।`);
    } else if (userSubView === UserSubView.DAILY_NOTES && noteForm.title) {
      setNotes([...notes, { id: Date.now().toString(), ...noteForm }]);
      setNoteForm({ title: '', content: '' });
      speak(`Hello sir! নতুন নোট মেমোরি ডেটাবেসে রেকর্ড করা হয়েছে।`);
    }
  };

  const removeRecord = (id: string, type: UserSubView) => {
    triggerSuccessVisual();
    if (type === UserSubView.DAILY_TASKS) setTasks(tasks.filter(t => t.id !== id));
    if (type === UserSubView.SCHEDULE) setSchedules(schedules.filter(s => s.id !== id));
    if (type === UserSubView.MEETINGS) setMeetings(meetings.filter(m => m.id !== id));
    if (type === UserSubView.DAILY_NOTES) setNotes(notes.filter(n => n.id !== id));
    speak(`Hello sir! রেকর্ডটি মেমোরি কোর থেকে মুছে ফেলা হয়েছে।`);
  };

  const getPlaceholderText = () => {
    if (selectedImage) return "ANALYZE THIS MEDIA ATTACHMENT...";
    if (isVideoCallActive) return "VISION SENSORS ONLINE. COMMAND...";
    if (isRecognitionActive) return "MONITORING VOCAL FREQUENCIES...";
    return "ESTABLISH NEURAL COMMAND PROTOCOL...";
  };

  if (view === AppView.AUTH) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#02020a] p-4">
        <div className="w-full max-sm:max-w-xs max-w-sm glass-panel p-6 md:p-8 rounded-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(0,210,255,0.1)]">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-400/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             </div>
          </div>
          <h1 className="orbitron text-xl md:text-2xl text-cyan-400 text-center mb-8 tracking-widest uppercase">{authMode === 'login' ? 'Authentication' : 'Neural Enrollment'}</h1>
          
          <div className="flex border-b border-white/10 mb-6">
            <button className={`flex-1 pb-3 orbitron text-[10px] tracking-widest transition-all ${authMode === 'login' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-white/40'}`} onClick={() => setAuthMode('login')}>LOGIN</button>
            <button className={`flex-1 pb-3 orbitron text-[10px] tracking-widest transition-all ${authMode === 'register' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-white/40'}`} onClick={() => setAuthMode('register')}>REGISTER</button>
          </div>

          {authMode === 'login' && (
            <div className="flex bg-[#0a0a1a] rounded p-1 mb-6">
              <button className={`flex-1 py-2 orbitron text-[9px] tracking-[0.2em] rounded-sm transition-all ${loginMethod === 'password' ? 'bg-cyan-500 text-black' : 'text-white/30'}`} onClick={() => setLoginMethod('password')}>PASSWORD LINK</button>
              <button className={`flex-1 py-2 orbitron text-[9px] tracking-[0.2em] rounded-sm transition-all ${loginMethod === 'pin' ? 'bg-cyan-500 text-black' : 'text-white/30'}`} onClick={() => setLoginMethod('pin')}>PIN ACCESS</button>
            </div>
          )}

          <div className="space-y-4">
            {authMode === 'register' && (
              <input type="text" placeholder="FULL NAME" className="w-full h-12 bg-black/50 border border-white/10 rounded px-4 orbitron text-xs focus:border-cyan-400 outline-none text-white" value={name} onChange={e => setName(e.target.value)} />
            )}
            <input type="email" placeholder="EMAIL ADDRESS" className="w-full h-12 bg-black/50 border border-white/10 rounded px-4 orbitron text-xs focus:border-cyan-400 outline-none text-white" value={email} onChange={e => setEmail(e.target.value)} />
            
            {(authMode === 'register' || loginMethod === 'password') && (
              <input type="password" placeholder="PASSWORD" className="w-full h-12 bg-black/50 border border-white/10 rounded px-4 orbitron text-xs focus:border-cyan-400 outline-none text-white" value={password} onChange={e => setPassword(e.target.value)} />
            )}
            
            {(authMode === 'register' || loginMethod === 'pin') && (
              <input type="password" placeholder="NEURAL PIN (4 DIGITS)" className="w-full h-12 bg-black/50 border border-white/10 rounded px-4 orbitron text-xs focus:border-cyan-400 outline-none text-white text-center tracking-[1em]" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} />
            )}

            {authMode === 'register' && (
              <input type="text" placeholder="MOBILE NUMBER" className="w-full h-12 bg-black/50 border border-white/10 rounded px-4 orbitron text-xs focus:border-cyan-400 outline-none text-white" value={mobile} onChange={e => setMobile(e.target.value)} />
            )}

            {error && <p className="text-red-500 text-[10px] orbitron bg-red-500/10 p-2 rounded border border-red-500/20 text-center">{error}</p>}
            
            <button onClick={handleAuth} className="w-full h-14 bg-cyan-500 hover:bg-cyan-400 text-black orbitron font-bold rounded transition-all active:scale-95 shadow-[0_0_20px_rgba(0,210,255,0.3)] mt-4">
              {authMode === 'login' ? 'INITIALIZE LINK' : 'COMMIT ENROLLMENT'}
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[9px] orbitron text-white/20 uppercase tracking-[0.2em]">Default Test Access: info@ab.com | 1234</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === AppView.PIN_ENTRY) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#02020a] p-4">
        <div className="w-full max-sm:max-w-xs max-w-sm glass-panel p-6 md:p-8 rounded-xl border border-cyan-500/30 text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-cyan-500/20 rounded-full mx-auto mb-6 flex items-center justify-center border border-cyan-400/30">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </div>
          <h1 className="orbitron text-lg md:text-xl text-cyan-400 mb-2 uppercase tracking-widest truncate">Hello, {currentUser?.name}</h1>
          <p className="text-[10px] orbitron text-white/40 mb-8 tracking-widest uppercase">Enter Neural Pin to Proceed</p>
          <input type="password" placeholder="PIN" className="w-full h-14 bg-black/50 border border-white/10 rounded-lg text-center orbitron text-2xl tracking-[1em] focus:border-cyan-400 outline-none mb-6 text-white" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePinSubmit()} />
          <button onClick={handlePinSubmit} className="w-full h-12 bg-cyan-500 text-black orbitron font-bold rounded transition-all active:scale-95 mb-4 shadow-[0_0_15px_rgba(0,210,255,0.2)]">ACCESS LINK</button>
        </div>
      </div>
    );
  }

  // --- USER PANEL VIEW ---
  if (view === AppView.USER_PANEL) {
    return (
      <div className="w-full h-full flex flex-col bg-[#02020a] p-4 md:p-10 overflow-hidden">
        <div className="flex bg-[#050515] border border-white/10 rounded-t-xl overflow-x-auto custom-scrollbar relative">
           {[
             { id: UserSubView.DAILY_TASKS, label: 'DAILY TASKS', customIcon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
             { id: UserSubView.SCHEDULE, label: 'SCHEDULE', customIcon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg> },
             { id: UserSubView.MEETINGS, label: 'MEETINGS', customIcon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg> },
             { id: UserSubView.DAILY_NOTES, label: 'DAILY NOTES', customIcon: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h6z"/></svg> }
           ].map(tab => (
             <button key={tab.id} onClick={() => setUserSubView(tab.id)} className={`flex-1 min-w-[140px] h-16 md:h-20 flex items-center justify-center space-x-3 orbitron text-[10px] md:text-[11px] font-black tracking-widest transition-all ${userSubView === tab.id ? 'bg-cyan-500/5 text-cyan-400 border-b-2 border-cyan-500' : 'text-white/30 hover:text-white/60'}`}>
               {tab.customIcon}<span>{tab.label}</span>
             </button>
           ))}
           <button onClick={() => setView(AppView.MAIN)} className="sticky right-0 px-4 h-full flex items-center bg-[#050515] text-white/20 hover:text-red-500 transition-colors border-l border-white/5"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        <div className="flex-1 bg-[#03030d]/80 border-x border-b border-white/10 p-4 md:p-16 space-y-8 md:space-y-12 overflow-y-auto custom-scrollbar">
           <div className="glass-panel p-6 md:p-10 border-white/5 rounded-xl space-y-8 max-w-5xl mx-auto">
              {userSubView === UserSubView.DAILY_TASKS && (
                <div className="space-y-6">
                   <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                      <input type="text" placeholder="TASK DESCRIPTION" className="flex-1 h-14 bg-black/40 border border-white/10 rounded px-6 orbitron text-xs tracking-widest outline-none focus:border-cyan-400/50" value={taskForm.desc} onChange={e => setTaskForm({...taskForm, desc: e.target.value})} />
                      <select className="w-full md:w-48 h-14 bg-black/40 border border-white/10 rounded px-4 orbitron text-[10px] tracking-widest outline-none text-white/60" value={taskForm.freq} onChange={e => setTaskForm({...taskForm, freq: e.target.value})}><option>DAILY</option><option>WEEKLY</option><option>MONTHLY</option></select>
                   </div>
                   <button onClick={addRecord} className="w-full h-14 bg-green-500 hover:bg-green-400 text-black orbitron font-black tracking-[0.3em] uppercase rounded-sm transition-all shadow-lg">Initialize Task</button>
                </div>
              )}
              {(userSubView === UserSubView.SCHEDULE || userSubView === UserSubView.MEETINGS) && (
                <div className="space-y-6">
                   <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
                      <input type="text" placeholder="EVENT TITLE" className="flex-1 h-14 bg-black/40 border border-white/10 rounded px-6 orbitron text-xs tracking-widest outline-none focus:border-cyan-400/50" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} />
                      <input type="date" className="w-full md:w-64 h-14 bg-black/40 border border-white/10 rounded px-6 orbitron text-xs tracking-widest outline-none text-white/60" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} />
                      <input type="time" className="w-full md:w-48 h-14 bg-black/40 border border-white/10 rounded px-6 orbitron text-xs tracking-widest outline-none text-white/60" value={eventForm.time} onChange={e => setEventForm({...eventForm, time: e.target.value})} />
                   </div>
                   <textarea placeholder="PROTOCOL DETAILS" className="w-full h-32 bg-black/40 border border-white/10 rounded p-6 orbitron text-xs tracking-widest outline-none focus:border-cyan-400/50 resize-none" value={eventForm.details} onChange={e => setEventForm({...eventForm, details: e.target.value})}></textarea>
                   <button onClick={addRecord} className="w-full h-14 bg-green-500 hover:bg-green-400 text-black orbitron font-black tracking-[0.3em] uppercase rounded-sm transition-all shadow-lg">Establish Event</button>
                </div>
              )}
              {userSubView === UserSubView.DAILY_NOTES && (
                <div className="space-y-6">
                   <input type="text" placeholder="NOTE TITLE" className="w-full h-14 bg-black/40 border border-white/10 rounded px-6 orbitron text-xs tracking-widest outline-none focus:border-cyan-400/50" value={noteForm.title} onChange={e => setNoteForm({...noteForm, title: e.target.value})} />
                   <textarea placeholder="NEURAL LOG CONTENT..." className="w-full h-48 bg-black/40 border border-white/10 rounded p-6 orbitron text-xs tracking-widest outline-none focus:border-cyan-400/50 resize-none" value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})}></textarea>
                   <button onClick={addRecord} className="w-full h-14 bg-green-500 hover:bg-green-400 text-black orbitron font-black tracking-[0.3em] uppercase rounded-sm transition-all shadow-lg">Record Note</button>
                </div>
              )}
           </div>
           <div className="max-w-5xl mx-auto space-y-6">
              <h4 className="orbitron text-[12px] font-black text-white/30 tracking-[0.4em] uppercase">Records</h4>
              <div className="space-y-4">
                 {userSubView === UserSubView.DAILY_TASKS && tasks.map(item => (
                   <div key={item.id} className="p-4 md:p-6 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center group hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center space-x-4"><div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div><span className="orbitron text-[10px] md:text-xs font-bold tracking-widest truncate max-w-[150px] md:max-w-none">{item.desc.toUpperCase()}</span></div>
                      <div className="flex items-center space-x-4 md:space-x-6"><span className="orbitron text-[8px] md:text-[10px] text-white/20 uppercase">{item.freq}</span><button onClick={() => removeRecord(item.id, UserSubView.DAILY_TASKS)} className="text-white/10 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></div>
                   </div>
                 ))}
                 {(userSubView === UserSubView.SCHEDULE ? schedules : meetings).map(item => (
                   <div key={item.id} className="p-6 md:p-8 bg-white/5 border border-white/5 rounded-xl space-y-4 group hover:border-cyan-500/30 transition-all relative">
                      <button onClick={() => removeRecord(item.id, userSubView)} className="absolute top-6 md:top-8 right-6 md:right-8 text-white/10 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                      <div className="flex flex-col md:flex-row md:justify-between space-y-2 md:space-y-0"><h5 className="orbitron text-sm font-black text-cyan-400 tracking-widest uppercase pr-10">{item.title}</h5><div className="flex space-x-4 text-[9px] md:text-[10px] orbitron text-white/20 uppercase md:pr-10"><span>{item.date}</span><span>{item.time}</span></div></div>
                      <p className="rajdhani text-xs text-white/40 uppercase leading-relaxed tracking-wider">{item.details}</p>
                   </div>
                 ))}
                 {userSubView === UserSubView.DAILY_NOTES && notes.map(item => (
                   <div key={item.id} className="p-6 md:p-8 bg-white/5 border border-white/5 rounded-xl space-y-4 group hover:border-cyan-500/30 transition-all relative">
                      <button onClick={() => removeRecord(item.id, UserSubView.DAILY_NOTES)} className="absolute top-6 md:top-8 right-6 md:right-8 text-white/10 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                      <h5 className="orbitron text-sm font-black text-cyan-400 tracking-widest uppercase pr-10">{item.title}</h5>
                      <p className="rajdhani text-xs text-white/40 uppercase leading-relaxed tracking-wider whitespace-pre-wrap">{item.content}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- ADMIN HUB PANEL ---
  if (view === AppView.ADMIN) {
    const allUsers = authService.getUsers();
    const filteredUsers = allUsers.filter(u => 
        u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
        u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
    );

    return (
      <div className="w-full h-full flex flex-col lg:flex-row bg-[#02020a] overflow-hidden text-white/90">
        <div className="w-full lg:w-64 border-b lg:border-r border-white/5 bg-[#050514] flex flex-row lg:flex-col p-4 lg:p-6 space-y-0 lg:space-y-10 items-center lg:items-start space-x-4 lg:space-x-0 overflow-x-auto lg:overflow-x-visible custom-scrollbar sticky top-0 z-50 lg:static">
           <div className="hidden lg:flex items-center space-x-3 mb-4 shrink-0">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-400/30">
                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h1 className="orbitron text-xl font-black tracking-widest text-white">HUB</h1>
           </div>
           <nav className="flex flex-row lg:flex-col space-x-2 lg:space-x-0 lg:space-y-3 whitespace-nowrap">
              {[
                { id: AdminSubView.VITALS, label: 'VITALS', icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2"/> },
                { id: AdminSubView.COGNITIVE, label: 'COGNITIVE', icon: <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/> },
                { id: AdminSubView.POPULATION, label: 'POPULATION', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/> },
                { id: AdminSubView.KNOWLEDGE, label: 'KNOWLEDGE', icon: <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/> },
                { id: AdminSubView.FINANCIALS, label: 'FINANCIALS', icon: <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/> },
                { id: AdminSubView.PERSONA, label: 'PERSONA', icon: <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/> }
              ].map(item => (
                <button key={item.id} onClick={() => setAdminSubView(item.id)} className={`flex items-center space-x-4 px-4 lg:px-5 py-3 lg:py-4 rounded-lg orbitron text-[10px] font-bold tracking-[0.2em] transition-all ${adminSubView === item.id ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(0,210,255,0.2)]' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{item.icon}</svg>
                  <span className="hidden sm:inline lg:inline">{item.label}</span>
                </button>
              ))}
           </nav>
        </div>
        <div className="flex-1 flex flex-col p-6 lg:p-12 relative overflow-y-auto custom-scrollbar bg-[#03030d]">
           <div className="absolute top-6 right-6 lg:top-10 lg:right-10 z-[60]">
              <button onClick={() => setView(AppView.MAIN)} className="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center text-white/30 hover:text-red-500 transition-colors bg-black/40 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
           </div>
           
           {adminSubView === AdminSubView.POPULATION && (
             <div className="animate-message space-y-6 lg:space-y-8 flex-1 flex flex-col pt-12 lg:pt-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                   <div className="flex items-center space-x-4 lg:space-x-6">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-400/30 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                      <h2 className="orbitron text-2xl lg:text-4xl font-black tracking-[0.2em] uppercase">Population</h2>
                   </div>
                   <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                        <div className="relative flex-1 sm:flex-none">
                            <input type="text" placeholder="SEARCH..." className="bg-black/60 border border-white/10 rounded h-11 lg:h-12 w-full sm:w-64 pl-4 pr-10 orbitron text-[10px] tracking-widest outline-none focus:border-cyan-400/50 text-white" value={userSearchQuery} onChange={(e) => setUserSearchQuery(e.target.value)} />
                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <button onClick={() => setShowEnrollmentForm(!showEnrollmentForm)} className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 lg:px-6 h-11 lg:h-12 orbitron text-[10px] lg:text-[11px] font-bold tracking-widest transition-all rounded-sm flex items-center justify-center space-x-2 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg><span>ENROLL</span></button>
                   </div>
                </div>

                {showEnrollmentForm && (
                    <div className="glass-panel p-6 lg:p-8 border border-cyan-500/20 rounded-xl space-y-6 animate-message">
                        <h3 className="orbitron text-xs font-black text-cyan-400 tracking-widest uppercase">Subject Neural Enrollment</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6">
                            <input type="text" placeholder="NAME" className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white" value={enrollForm.name} onChange={e => setEnrollForm({...enrollForm, name: e.target.value})} />
                            <input type="email" placeholder="EMAIL" className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white" value={enrollForm.email} onChange={e => setEnrollForm({...enrollForm, email: e.target.value})} />
                            <input type="password" placeholder="PIN" className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white" maxLength={4} value={enrollForm.pin} onChange={e => setEnrollForm({...enrollForm, pin: e.target.value})} />
                            <input type="text" placeholder="MOBILE" className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white" value={enrollForm.mobile} onChange={e => setEnrollForm({...enrollForm, mobile: e.target.value})} />
                            <select className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white" value={enrollForm.tier} onChange={e => setEnrollForm({...enrollForm, tier: e.target.value as User['tier']})}>
                                <option value="FREE">FREE TIER</option><option value="PRO">PRO TIER</option><option value="ENTERPRISE">ENTERPRISE</option>
                            </select>
                            <button onClick={handleEnrollment} className="h-11 bg-green-500 text-black orbitron text-[10px] font-black tracking-widest rounded-sm">COMMIT</button>
                        </div>
                    </div>
                )}

                <div className="glass-panel flex-1 overflow-x-auto border border-white/5 rounded-xl flex flex-col">
                   <div className="min-w-[600px] flex-1">
                        <table className="w-full orbitron text-[10px] md:text-[11px] font-bold tracking-widest text-left">
                            <thead className="bg-[#0a0a1a] sticky top-0 z-10 border-b border-white/10">
                                <tr>
                                    <th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Subject Ident</th>
                                    <th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Access Tier</th>
                                    <th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Status</th>
                                    <th className="p-4 lg:p-6 text-center text-white/30 uppercase tracking-[0.3em]">Protocols</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user, i) => (
                                    <tr key={i} className="hover:bg-cyan-500/5 transition-colors">
                                        <td className="p-4 lg:p-6"><div className="flex flex-col"><span className="text-white truncate max-w-[150px]">{user.name.toUpperCase()}</span><span className="text-[9px] text-white/20 tracking-normal mt-1 truncate max-w-[150px]">{user.email}</span></div></td>
                                        <td className="p-4 lg:p-6"><select className={`px-2 py-1 rounded text-[9px] font-black border tracking-widest bg-black/40 outline-none ${user.tier === 'PRO' ? 'text-cyan-400 border-cyan-500/30' : user.tier === 'ENTERPRISE' ? 'text-purple-400 border-purple-500/30' : 'text-white/20 border-white/10'}`} value={user.tier || 'FREE'} onChange={(e) => authService.updateUser(user.id, { tier: e.target.value as any })}><option value="FREE">FREE</option><option value="PRO">PRO</option><option value="ENTERPRISE">ENTERPRISE</option></select></td>
                                        <td className="p-4 lg:p-6"><div className="flex items-center space-x-3"><div className={`w-2 h-2 rounded-full ${user.status === 'REVOKED' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-green-500 shadow-[0_0_8px_#22c55e]'}`}></div><span className={user.status === 'REVOKED' ? 'text-red-500' : 'text-green-500'}>{user.status || 'ACTIVE'}</span></div></td>
                                        <td className="p-4 lg:p-6 text-center"><div className="flex items-center justify-center space-x-3"><button onClick={() => authService.updateUser(user.id, { status: user.status === 'REVOKED' ? 'ACTIVE' : 'REVOKED' })} className={`px-3 py-1 rounded-sm text-[8px] border transition-all ${user.status === 'REVOKED' ? 'border-green-500/40 text-green-500 hover:bg-green-500 hover:text-black' : 'border-red-500/40 text-red-500 hover:bg-red-500 hover:text-black'}`}>{user.status === 'REVOKED' ? 'RESTORE' : 'SUSPEND'}</button><button onClick={() => authService.deleteUser(user.id)} className="text-white/10 hover:text-red-500 transition-colors p-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                   </div>
                </div>
             </div>
           )}

           {adminSubView === AdminSubView.KNOWLEDGE && (
             <div className="animate-message space-y-6 lg:space-y-8 flex-1 flex flex-col pt-12 lg:pt-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                   <div className="flex items-center space-x-4 lg:space-x-6">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-400/30 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      </div>
                      <h2 className="orbitron text-2xl lg:text-4xl font-black tracking-[0.2em] uppercase">Knowledge Base</h2>
                   </div>
                   <button onClick={() => setShowKnowledgeForm(!showKnowledgeForm)} className="bg-cyan-500 hover:bg-cyan-400 text-black px-4 lg:px-6 h-11 lg:h-12 orbitron text-[10px] lg:text-[11px] font-bold tracking-widest transition-all rounded-sm flex items-center justify-center space-x-2 shrink-0"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14"/></svg><span>ADD SOURCE</span></button>
                </div>

                {showKnowledgeForm && (
                  <div className="glass-panel p-6 lg:p-8 border border-cyan-500/20 rounded-xl space-y-6 animate-message">
                    <h3 className="orbitron text-xs font-black text-cyan-400 tracking-widest uppercase">Neural Source Integration</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                      <input type="text" placeholder="RESOURCE NAME" className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white" value={knowledgeForm.name} onChange={e => setKnowledgeForm({...knowledgeForm, name: e.target.value})} />
                      <select className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white" value={knowledgeForm.type} onChange={e => setKnowledgeForm({...knowledgeForm, type: e.target.value})}>
                        <option>PDF</option><option>E-BOOK</option><option>WEBSITE</option><option>GOOGLE DRIVE</option><option>GOOGLE SHEETS</option>
                      </select>
                      <input type="text" placeholder="SOURCE URL / LINK" className="bg-black/60 border border-white/10 rounded h-11 px-4 orbitron text-[10px] text-white sm:col-span-1 md:col-span-1" value={knowledgeForm.link} onChange={e => setKnowledgeForm({...knowledgeForm, link: e.target.value})} />
                      <button onClick={handleKnowledgeEntry} className="h-11 bg-green-500 text-black orbitron text-[10px] font-black tracking-widest rounded-sm">INITIATE INDEX</button>
                    </div>
                  </div>
                )}

                <div className="glass-panel flex-1 overflow-x-auto border border-white/5 rounded-xl flex flex-col">
                  <div className="min-w-[600px] flex-1">
                    <table className="w-full orbitron text-[10px] md:text-[11px] font-bold tracking-widest text-left">
                      <thead className="bg-[#0a0a1a] sticky top-0 z-10 border-b border-white/10">
                        <tr>
                          <th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Resource</th>
                          <th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Origin Type</th>
                          <th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Neural Status</th>
                          <th className="p-4 lg:p-6 text-center text-white/30 uppercase tracking-[0.3em]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {knowledgeSources.map((source) => (
                          <tr key={source.id} className="hover:bg-cyan-500/5 transition-colors">
                            <td className="p-4 lg:p-6"><span className="text-white truncate max-w-[200px] block">{source.name.toUpperCase()}</span></td>
                            <td className="p-4 lg:p-6"><span className="text-cyan-400/60 text-[9px] border border-cyan-500/20 px-2 py-0.5 rounded">{source.type}</span></td>
                            <td className="p-4 lg:p-6">
                              <div className="flex items-center space-x-3">
                                <div className={`w-2 h-2 rounded-full ${source.status === 'INDEXED' || source.status === 'SYNCED' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                                <span className={source.status === 'INDEXED' || source.status === 'SYNCED' ? 'text-green-500' : 'text-yellow-500'}>{source.status}</span>
                              </div>
                            </td>
                            <td className="p-4 lg:p-6 text-center">
                              <div className="flex items-center justify-center space-x-4">
                                <button onClick={() => deleteKnowledgeSource(source.id)} className="text-white/10 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
             </div>
           )}

           {adminSubView === AdminSubView.FINANCIALS && (
             <div className="animate-message space-y-6 lg:space-y-8 flex-1 flex flex-col pt-12 lg:pt-0">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                   <div className="flex items-center space-x-4 lg:space-x-6">
                      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded bg-cyan-500/10 flex items-center justify-center border border-cyan-400/30 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="2.5"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                      </div>
                      <h2 className="orbitron text-2xl lg:text-4xl font-black tracking-[0.2em] uppercase">Financials</h2>
                   </div>
                   <div className="flex bg-[#0a0a1a] p-1 border border-white/10 rounded shrink-0 self-start">
                      <button onClick={() => setFinancialsTab('GATEWAYS')} className={`px-4 lg:px-6 py-2 orbitron text-[9px] lg:text-[10px] font-black tracking-widest uppercase rounded-sm transition-all ${financialsTab === 'GATEWAYS' ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white/80'}`}>GATEWAYS</button>
                      <button onClick={() => setFinancialsTab('TIERS')} className={`px-4 lg:px-6 py-2 orbitron text-[9px] lg:text-[10px] font-black tracking-widest uppercase rounded-sm transition-all ${financialsTab === 'TIERS' ? 'bg-cyan-500 text-black' : 'text-white/40 hover:text-white/80'}`}>TIERS</button>
                   </div>
                </div>

                {financialsTab === 'GATEWAYS' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-8">
                        {(Object.keys(gateways) as Array<keyof typeof gateways>).map((id) => (
                            <div key={id} className={`glass-panel p-6 lg:p-10 flex flex-col items-center border rounded-2xl space-y-6 lg:space-y-8 bg-[#0a0a1f]/50 transition-all ${gateways[id].active ? 'border-cyan-500/20' : 'border-white/5 opacity-60'}`}>
                                <div className={`w-16 h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center border-2 shadow-inner transition-all ${gateways[id].active ? 'bg-cyan-500/10 border-cyan-400/20' : 'bg-white/5 border-white/10'}`}>
                                    {id === 'stripe' && <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={gateways[id].active ? "#00d2ff" : "#555"} strokeWidth="1.5"><path d="M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM3 10h18"/></svg>}
                                    {id === 'bkash' && <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={gateways[id].active ? "#00d2ff" : "#555"} strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>}
                                    {id === 'paypal' && <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={gateways[id].active ? "#00d2ff" : "#555"} strokeWidth="1.5"><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>}
                                </div>
                                <h3 className="orbitron text-xl lg:text-2xl font-black tracking-[0.3em] uppercase">{id}</h3>
                                <span className={`orbitron text-[8px] font-bold tracking-[0.2em] px-3 py-1 rounded-full border ${gateways[id].active ? 'text-green-500 border-green-500/20 bg-green-500/5' : 'text-red-500 border-red-500/20 bg-red-500/5'}`}>{gateways[id].status}</span>
                                <button onClick={() => toggleGateway(id)} className={`w-full h-11 lg:h-14 orbitron text-[10px] font-black tracking-[0.3em] rounded-md transition-all ${gateways[id].active ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-cyan-500 text-black shadow-lg'}`}>{gateways[id].active ? 'DECOUPLE' : 'ESTABLISH'}</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-panel flex-1 overflow-x-auto border border-white/5 rounded-xl flex flex-col">
                        <div className="min-w-[600px] flex-1">
                            <table className="w-full orbitron text-[10px] md:text-[11px] font-bold tracking-widest text-left">
                                <thead className="bg-[#0a0a1a] sticky top-0 z-10 border-b border-white/10">
                                    <tr><th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Plan</th><th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Cost</th><th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Tokens</th><th className="p-4 lg:p-6 text-white/30 uppercase tracking-[0.3em]">Features</th><th className="p-4 lg:p-6 text-center text-white/30 uppercase tracking-[0.3em]">Action</th></tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {tierMatrix.map((tier, i) => (
                                        <tr key={i} className="hover:bg-cyan-500/5 transition-colors">
                                            <td className="p-4 lg:p-6 text-white">{tier.id}</td><td className="p-4 lg:p-6 text-cyan-400">{tier.price}</td><td className="p-4 lg:p-6 text-white/60">{tier.tokens}</td>
                                            <td className="p-4 lg:p-6"><div className="flex flex-wrap gap-2">{tier.features.map((f, j) => (<span key={j} className="text-[8px] bg-white/5 border border-white/5 px-2 py-0.5 rounded text-white/40">{f}</span>))}</div></td>
                                            <td className="p-4 lg:p-6 text-center"><button className="text-cyan-400 hover:text-cyan-300 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
             </div>
           )}

           {adminSubView === AdminSubView.COGNITIVE && (
             <div className="animate-message space-y-8 pt-12 lg:pt-0">
                <div className="flex items-center justify-between"><h2 className="orbitron text-2xl lg:text-4xl font-black tracking-[0.2em] uppercase">LLM Matrix</h2></div>
                <div className="grid grid-cols-1 gap-4 lg:gap-5">
                   {llmConfigs.map((llm, i) => (
                     <div key={i} className={`p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group transition-all rounded-lg border-2 ${llm.inUse ? 'bg-cyan-500/5 border-cyan-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-center space-x-6 lg:space-x-8"><div className={`w-3 h-3 lg:w-4 lg:h-4 rounded-full ${llm.inUse ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-white/20'}`}></div><div><p className="orbitron text-base lg:text-lg font-black tracking-widest mb-1">{llm.name}</p><p className="orbitron text-[8px] lg:text-[9px] text-white/40 uppercase tracking-widest">{llm.status}</p></div></div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                           <input type="password" value={llm.key} placeholder="AUTH KEY" className="bg-black/60 border border-white/10 rounded h-11 lg:h-12 w-full sm:w-64 lg:w-80 px-4 lg:px-6 orbitron text-[9px] lg:text-[10px] tracking-widest outline-none text-white/80" readOnly />
                           <button onClick={() => deployLLM(llm.id)} className={`h-11 lg:h-12 px-6 orbitron text-[9px] lg:text-[10px] font-black tracking-widest rounded-sm transition-all ${llm.inUse ? 'bg-cyan-500 text-black' : 'border border-white/20 text-white/40 hover:bg-white/10'}`}>{llm.inUse ? 'IN USE' : 'DEPLOY'}</button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {adminSubView === AdminSubView.PERSONA && (
             <div className="animate-message h-full flex flex-col space-y-8 lg:space-y-10 pt-12 lg:pt-0">
                <div className="flex items-center justify-between"><h2 className="orbitron text-2xl lg:text-4xl font-black tracking-[0.2em] uppercase">Neural Identity</h2></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                   <div className="glass-panel p-6 lg:p-8 border-white/5 rounded-xl space-y-6">
                      <h3 className="orbitron text-[10px] lg:text-[12px] font-black text-cyan-400/70 uppercase tracking-[0.3em]">Core Persona Config</h3>
                      <div className="space-y-4">
                         <div><label className="text-[9px] lg:text-[10px] orbitron text-white/30 uppercase tracking-widest mb-2 block">Cognitive Name</label><input type="text" className="w-full h-11 lg:h-12 bg-black/40 border border-white/10 rounded px-4 orbitron text-xs text-white" value={personaConfig.name} onChange={e => setPersonaConfig({...personaConfig, name: e.target.value})} /></div>
                         <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[9px] lg:text-[10px] orbitron text-white/30 uppercase tracking-widest mb-2 block">Vocal Tone</label><select className="w-full h-11 lg:h-12 bg-black/40 border border-white/10 rounded px-3 orbitron text-[10px] text-white" value={personaConfig.tone} onChange={e => setPersonaConfig({...personaConfig, tone: e.target.value})}><option>PROFESSIONAL</option><option>FRIENDLY</option><option>ROBOTIC</option><option>CURT</option></select></div>
                            <div><label className="text-[9px] lg:text-[10px] orbitron text-white/30 uppercase tracking-widest mb-2 block">Language Link</label><select className="w-full h-11 lg:h-12 bg-black/40 border border-white/10 rounded px-3 orbitron text-[10px] text-white" value={personaConfig.language} onChange={e => setPersonaConfig({...personaConfig, language: e.target.value})}><option>BENGALI</option><option>ENGLISH</option></select></div>
                         </div>
                      </div>
                   </div>
                   <div className="glass-panel p-6 lg:p-8 border-white/5 rounded-xl flex flex-col"><h3 className="orbitron text-[10px] lg:text-[12px] font-black text-cyan-400/70 uppercase tracking-[0.3em]">Neural System Logic</h3><textarea className="w-full flex-1 min-h-[120px] bg-black/40 border border-white/10 rounded p-4 orbitron text-[9px] lg:text-[10px] text-white/70 mt-4 focus:border-cyan-500/30 outline-none resize-none" value={personaConfig.systemInstruction} onChange={e => setPersonaConfig({...personaConfig, systemInstruction: e.target.value})}></textarea></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
                   {[{ id: 'silent', label: 'Idle State', src: zerinVideos.silent },{ id: 'think', label: 'Thinking State', src: zerinVideos.think },{ id: 'speak', label: 'Speaking State', src: zerinVideos.speak }].map(vid => (
                      <div key={vid.id} className="flex flex-col space-y-3">
                         <h3 className="orbitron text-[8px] lg:text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">{vid.label}</h3>
                         <div className="relative aspect-square border-2 border-dashed border-white/10 rounded-2xl overflow-hidden group bg-black/40">
                            <video className="w-full h-full object-cover opacity-60" src={vid.src} autoPlay loop muted playsInline />
                            <div className="absolute inset-0 bg-black/70 opacity-0 lg:group-hover:opacity-100 flex items-center justify-center transition-all px-4"><button onClick={() => { setUploadType(vid.id as any); fileInputRef.current?.click(); }} className="w-full bg-cyan-500 text-black orbitron text-[8px] lg:text-[9px] font-black py-3 rounded-sm truncate">UPLOAD MEDIA</button></div>
                         </div>
                      </div>
                   ))}
                </div>
                <div className="p-6 lg:p-8 glass-panel border border-cyan-500/20 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-6 mt-auto">
                   <p className="rajdhani text-[10px] lg:text-xs text-white/30 uppercase tracking-[0.3em] text-center sm:text-left">System core sync required after modifications.</p>
                   <button onClick={() => { savePersonaConfig({}); setView(AppView.MAIN); }} className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-black orbitron text-[10px] lg:text-[11px] font-black px-12 h-12 lg:h-14 rounded-sm shadow-[0_0_30px_rgba(0,210,255,0.3)] transition-all uppercase tracking-[0.2em]">Commit Changes</button>
                </div>
             </div>
           )}

           {adminSubView === AdminSubView.VITALS && (
             <div className="animate-message pt-12 lg:pt-0"><div className="flex items-center space-x-4 lg:space-x-6 mb-8 lg:mb-12"><svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="3"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><h2 className="orbitron text-2xl lg:text-4xl font-black tracking-[0.2em] uppercase">Vitals</h2></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10"><div className="glass-panel p-6 lg:p-10 border-white/5 shadow-2xl rounded-2xl bg-[#0a0a1f]/30"><h3 className="orbitron text-[10px] lg:text-[12px] font-bold text-white/30 mb-8 uppercase tracking-[0.3em]">Neural Load Map</h3><div className="h-48 lg:h-64 flex items-end space-x-1 lg:space-x-2">{[40, 60, 45, 80, 50, 65, 90, 30, 75, 40, 55, 60, 40].map((h, i) => (<div key={i} className="flex-1 bg-cyan-500/20 border-t-2 border-cyan-500 group relative transition-all" style={{height: `${h}%`}}><div className="absolute inset-0 bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div></div>))}</div></div><div className="glass-panel p-6 lg:p-10 border-white/5 shadow-2xl rounded-2xl bg-[#0a0a1f]/30 space-y-6 lg:space-y-10"><h3 className="orbitron text-[10px] lg:text-[12px] font-bold text-white/30 mb-4 uppercase tracking-[0.3em]">Core Status Logs</h3><div className="space-y-4 lg:space-y-6">{[{ label: 'SYNAPSE_LINK', val: 'STABLE', col: 'text-green-500' },{ label: 'MEMORY_BUFFER', val: '14.2 GB', col: 'text-cyan-400' },{ label: 'CORE_LATENCY', val: '12ms', col: 'text-cyan-400' },{ label: 'VISION_PIPELINE', val: isVideoCallActive ? 'ACTIVE' : 'IDLE', col: isVideoCallActive ? 'text-green-500' : 'text-white/20' }].map((st, i) => (<div key={i} className="flex justify-between items-center border-b border-white/5 pb-4"><span className="orbitron text-[9px] lg:text-[10px] font-bold tracking-[0.3em] text-white/60 uppercase">{st.label}</span><span className={`orbitron text-[10px] lg:text-[11px] font-black tracking-widest ${st.col}`}>{st.val}</span></div>))}</div></div></div></div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-between p-4 md:p-6 lg:p-10 overflow-hidden bg-[#02020a]">
      <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center space-x-3 md:space-x-4 p-3 md:p-4 border border-cyan-500/20 glass-panel rounded-sm shadow-xl z-20 max-w-[calc(100%-2rem)]">
        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-cyan-400 border border-cyan-400/30 bg-cyan-500/5 shrink-0">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="text-[10px] md:text-xs orbitron font-black tracking-[0.1em] md:tracking-[0.2em] text-white truncate uppercase">LINK: {personaConfig.name}</h3>
          <div className="flex items-center space-x-2 mt-0.5 md:mt-1">
             <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
             <span className="text-[8px] md:text-[10px] text-green-500/80 font-bold uppercase tracking-widest truncate">{currentUser?.name}</span>
          </div>
        </div>
        <div className="border-l border-white/10 pl-3 md:pl-4 ml-1 md:ml-2">
          <button onClick={() => toggleVideoCall()} className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg transition-all ${isVideoCallActive ? 'bg-cyan-500 text-black shadow-[0_0_15px_#00d2ff]' : 'bg-white/5 text-white/30 hover:bg-white/10'}`} title="Toggle Vision Sensor"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg></button>
        </div>
      </div>

      <div onClick={() => setIsAvatarVisible(!isAvatarVisible)} className="hidden lg:block absolute bottom-40 right-10 w-24 h-24 rounded-full border-4 border-cyan-500/20 glass-panel overflow-hidden shadow-2xl z-40 group cursor-pointer hover:border-cyan-500 transition-all">
         <video className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" src={zerinVideos.silent} autoPlay loop muted playsInline /><div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"><span className="orbitron text-[8px] font-black text-white uppercase tracking-tighter">Portal</span></div>
      </div>

      <div className="flex-1 w-full flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-8 mt-16 lg:mt-24 mb-16 lg:mb-20 overflow-hidden">
        <div className="flex-1 flex flex-col glass-panel rounded-2xl overflow-hidden border border-cyan-500/10 shadow-inner min-h-0">
           <div className="p-4 lg:p-6 border-b border-cyan-500/10 flex justify-between items-center bg-black/20">
              <span className="orbitron text-[10px] lg:text-[11px] font-black text-cyan-400/70 uppercase tracking-[0.2em] md:tracking-[0.3em]">Dialogue Stream</span>
              <div className="flex items-center space-x-4">
                <button onClick={() => { setUploadType('chat'); fileInputRef.current?.click(); }} className="text-[9px] lg:text-[10px] orbitron font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-[0.1em] flex items-center space-x-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg><span className="hidden sm:inline">Attach</span></button>
                <button onClick={clearChat} className="text-[9px] lg:text-[10px] orbitron font-bold text-red-500/50 hover:text-red-500 transition-colors uppercase tracking-[0.1em]">Purge</button>
              </div>
           </div>
           <div className="flex-1 p-4 lg:p-8 overflow-y-auto custom-scrollbar space-y-6">
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale px-10 text-center"><svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p className="orbitron text-[10px] md:text-sm mt-6 font-black tracking-[0.5em] uppercase">No Active Link</p></div>
              ) : (
                chatHistory.map((chat, idx) => (
                  <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] lg:max-w-[75%] p-4 lg:p-5 rounded-2xl orbitron text-[10px] lg:text-[12px] font-semibold leading-relaxed tracking-widest shadow-lg animate-message ${chat.role === 'user' ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400' : 'bg-[#0a0a20] border border-white/10 text-white/90'}`}>{chat.image && <img src={chat.image} alt="User upload" className="mb-4 max-w-full rounded-lg border border-cyan-500/40 shadow-[0_0_20px_rgba(0,210,255,0.1)]" />}{chat.text}</div></div>
                ))
              )}
           </div>
        </div>
        {isAvatarVisible && (
          <div className="relative w-full lg:w-[400px] xl:w-[500px] flex flex-col items-center justify-center animate-message shrink-0">
              <div className="relative w-40 sm:w-64 lg:w-full aspect-square rounded-full border-[6px] lg:border-[12px] border-black shadow-[0_0_50px_rgba(0,0,0,1)] lg:shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden bg-[#050514]"><div className="absolute inset-0 bg-gradient-to-b from-cyan-900/10 to-transparent"></div><div className="relative w-full h-full"><video ref={silentRef} className={`assistant-video ${animState === AnimationState.SILENT ? 'is-active anim-active' : ''} ${isTriggerSuccess ? 'trigger-success' : ''}`} src={zerinVideos.silent} autoPlay loop muted playsInline /><video ref={thinkRef} className={`assistant-video ${animState === AnimationState.THINK ? 'is-active anim-active' : ''} ${isTriggerSuccess ? 'trigger-success' : ''}`} src={zerinVideos.think} autoPlay loop={false} muted playsInline /><video ref={speakRef} className={`assistant-video ${animState === AnimationState.SPEAK ? 'is-active anim-active' : ''} ${isTriggerSuccess ? 'trigger-success' : ''}`} src={zerinVideos.speak} autoPlay loop muted playsInline /></div><div className="absolute bottom-4 lg:bottom-10 left-1/2 -translate-x-1/2 orbitron text-[10px] lg:text-sm font-black tracking-[0.4em] lg:tracking-[0.6em] text-cyan-400 drop-shadow-[0_0_15px_rgba(0,210,255,0.8)] uppercase">{personaConfig.name}</div></div>
              {isVideoCallActive && detectedObjects.length > 0 && (<div className="absolute top-0 lg:top-10 flex flex-wrap justify-center gap-2 lg:gap-3 px-4">{detectedObjects.slice(0, 3).map((obj, i) => (<div key={i} className="glass-panel px-3 py-1 lg:px-4 lg:py-2 rounded-full border border-cyan-500/40 orbitron text-[8px] lg:text-[10px] font-black text-cyan-400 animate-pulse shadow-lg tracking-[0.1em]">{obj.name.toUpperCase()} <span className="text-white/40 ml-1">{obj.confidence}%</span></div>))}</div>)}
          </div>
        )}
      </div>

      <div className="w-full flex flex-col items-center space-y-4 md:space-y-8 z-30">
        {selectedImage && (<div className="relative animate-bounce group"><div className="h-16 w-16 md:h-24 md:w-24 bg-black/60 rounded-xl p-1 border-2 border-cyan-500 shadow-[0_0_30px_rgba(0,210,255,0.4)] overflow-hidden"><img src={selectedImage} alt="Preview" className="h-full w-full object-cover rounded-lg" /></div><button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-red-500 text-white rounded-full p-1.5 md:p-2 shadow-2xl border-2 border-black hover:bg-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>)}
        <div className="w-full max-w-3xl flex items-center space-x-3 md:space-x-6">
           <div className="relative flex-1 group"><div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 text-cyan-400/40 group-hover:text-cyan-400 transition-colors cursor-pointer z-10"><button onClick={() => { setUploadType('chat'); fileInputRef.current?.click(); }} className="p-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg></button></div><input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} /><input type="text" placeholder={getPlaceholderText()} className="w-full h-12 md:h-16 bg-[#08081a] border-2 border-white/5 rounded-xl pl-12 md:pl-16 pr-6 md:pr-8 orbitron text-[10px] md:text-xs font-bold tracking-[0.1em] md:tracking-[0.2em] text-white focus:outline-none focus:border-cyan-500/50 focus:scale-[1.01] focus:shadow-[0_0_25px_rgba(0,210,255,0.2)] transition-all duration-300 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && (handleCommand(inputText, selectedImage || undefined), setInputText(''))} /></div>
           <button onClick={() => { handleCommand(inputText, selectedImage || undefined); setInputText(''); }} className="w-12 h-12 md:w-16 md:h-16 bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-all active:scale-90 rounded-xl shadow-[0_0_30px_rgba(0,210,255,0.3)] group shrink-0"><svg className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#02020a" strokeWidth="3"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>
        </div>
        <div className="relative w-full max-w-4xl h-20 md:h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,1)] overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-red-500/5"></div><div className="scanning-line opacity-20"></div></div>
            <div className="relative z-10 w-full flex items-center justify-between px-6 md:px-12">
                <div className="flex items-center space-x-3 md:space-x-6">
                    <button onClick={() => setView(AppView.USER_PANEL)} className="group flex flex-col items-center"><div className="p-2 md:p-3 rounded-lg bg-white/5 group-hover:bg-cyan-500/10 transition-all border border-transparent group-hover:border-cyan-500/20"><svg className="text-white/40 group-hover:text-cyan-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div><span className="hidden sm:block text-[8px] md:text-[9px] orbitron mt-1 text-white/20 group-hover:text-cyan-400/50 uppercase font-black tracking-widest">Logs</span></button>
                    <button onClick={() => setView(AppView.ADMIN)} className="group flex flex-col items-center"><div className="p-2 md:p-3 rounded-lg bg-white/5 group-hover:bg-cyan-500/10 transition-all border border-transparent group-hover:border-cyan-500/20"><svg className="text-white/40 group-hover:text-cyan-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><span className="hidden sm:block text-[8px] md:text-[9px] orbitron mt-1 text-white/20 group-hover:text-cyan-400/50 uppercase font-black tracking-widest">Hub</span></button>
                </div>
                <div className="flex items-center -space-x-3 md:-space-x-4">
                    <button onClick={() => isRecognitionActive ? (recognitionRef.current?.stop(), setIsRecognitionActive(false)) : startRecognition()} className={`z-20 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all duration-300 border-[4px] md:border-[6px] border-[#02020a] shadow-2xl ${isRecognitionActive ? 'bg-red-500 mic-active scale-110' : 'bg-cyan-500 mic-inactive'}`}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg></button>
                    <button onClick={() => toggleVideoCall()} className={`z-10 w-12 h-12 md:w-16 md:h-16 pl-4 md:pl-6 pr-3 md:pr-4 rounded-r-2xl flex items-center justify-center transition-all duration-300 border border-white/5 ${isVideoCallActive ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(0,210,255,0.2)]' : 'bg-white/5 text-white/30 hover:text-cyan-400'}`}><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg></button>
                </div>
                <div className="flex items-center space-x-3 md:space-x-6">
                    <button onClick={() => setIsAvatarVisible(!isAvatarVisible)} className="group flex flex-col items-center"><div className={`p-2 md:p-3 rounded-lg bg-white/5 transition-all border border-transparent ${isAvatarVisible ? 'text-cyan-400' : 'text-white/40'} group-hover:bg-cyan-500/10 group-hover:border-cyan-500/20`}>{isAvatarVisible ? (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>)}</div><span className="hidden sm:block text-[8px] md:text-[9px] orbitron mt-1 text-white/20 group-hover:text-cyan-400/50 uppercase font-black tracking-widest">Portal</span></button>
                    <button onClick={handleLogout} className="group flex flex-col items-center"><div className="p-2 md:p-3 rounded-lg bg-white/5 group-hover:bg-red-500/10 transition-all border border-transparent group-hover:border-red-500/20"><svg className="text-white/40 group-hover:text-red-500" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg></div><span className="hidden sm:block text-[8px] md:text-[9px] orbitron mt-1 text-white/20 group-hover:text-red-500/50 uppercase font-black tracking-widest">Eject</span></button>
                </div>
            </div>
        </div>
      </div>
      <video ref={userVideoRef} id="userVideo" autoPlay playsInline className={isVideoCallActive ? 'block fixed top-4 right-4 w-32 md:top-8 md:right-8 md:w-64 rounded-xl shadow-2xl z-[100] transform scale-x-[-1]' : 'hidden'} />
      <div id="dev-attribution" className="absolute bottom-2 right-4 md:bottom-4 md:right-10 z-[110]"></div>
    </div>
  );
};

export default ZerinInterface;
