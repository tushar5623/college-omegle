import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, SkipForward } from 'lucide-react';
import { io } from "socket.io-client";
import {
  LiveKitRoom,
  VideoConference,
  GridLayout,
  ParticipantTile,
  useTracks,
  RoomAudioRenderer,
  ControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';

// --- CONFIGURATION ---
// 1. Apna Backend URL daalo (Render wala)
const BACKEND_URL = "https://college-omegle-backend.onrender.com";
// 2. Apna LiveKit Cloud URL daalo (wss://...)
const LIVEKIT_URL = "wss://college-omegle-r9modtcj.livekit.cloud"; 

const socket = io(BACKEND_URL);

function App() {
  // States
  const [step, setStep] = useState('landing'); 
  const [email, setEmail] = useState("");
  const [roomID, setRoomID] = useState(null);
  const [token, setToken] = useState(""); // LiveKit Video Token
  
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const chatEndRef = useRef(null); 

  useEffect(() => {
    // A. MATCH FOUND (Socket ne jodi bana di)
    socket.on("match-found", async (data) => {
      console.log("✅ Match Found! Room:", data.roomID);
      setRoomID(data.roomID);
      setStep('loading_video'); // Thoda wait token lene ke liye

      // B. TOKEN FETCH (Video Room ki chabi mango)
      try {
        const resp = await fetch(`${BACKEND_URL}/getToken?roomName=${data.roomID}&participantName=${email || "Student"}`);
        const videoToken = await resp.text();
        
        setToken(videoToken);
        setStep('video'); // Token mil gaya, Video chalu karo!
        setMessages([]); 
      } catch (error) {
        console.error("Token Error:", error);
        alert("Video connect nahi ho paya!");
        setStep('searching');
      }
    });

    // C. PARTNER LEFT (Socket ne bataya)
    socket.on("partner-left", () => {
      setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected.' }]);
      // Optional: Auto-next logic yahan laga sakte ho
    });

    // D. CHAT (Text messages)
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, { sender: 'stranger', text: msg }]);
    });

    return () => {
      socket.off("match-found");
      socket.off("partner-left");
      socket.off("receive-message");
    };
  }, [email]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // --- NEXT BUTTON LOGIC ---
  const handleNext = () => {
    // 1. Current Video Room Chhodo
    setToken(""); 
    setStep('searching');
    setMessages([]);
    setRoomID(null);

    // 2. Server ko bolo "Skip karo"
    socket.emit("skip-partner");

    // 3. Wapas Queue join karo
    setTimeout(() => {
        socket.emit("join-room", email);
    }, 500);
  };

  const handleStartMatching = () => {
    if (!email) return alert("Please enter college email!");
    setStep('searching');
    socket.emit("join-room", email);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages((prev) => [...prev, { sender: 'me', text: inputMsg }]);
    socket.emit("send-message", { room: roomID, message: inputMsg });
    setInputMsg("");
  };

  return (
    <div className="h-screen w-full bg-neutral-950 text-white overflow-hidden font-sans relative">
      
      {/* BACKGROUND ANIMATION (Glassmorphism) */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000 pointer-events-none"></div>

      {/* 1. LANDING PAGE */}
      {step === 'landing' && (
         <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">
            <div className="glass-card p-10 rounded-3xl w-full max-w-lg text-center border border-white/10 shadow-2xl">
               <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                 College Omegle
               </h1>
               <p className="text-neutral-400 mb-8">Connect with random students instantly.</p>
               
               <Input 
                 placeholder="Enter College Email ID" 
                 value={email} 
                 onChange={(e) => setEmail(e.target.value)} 
                 className="bg-neutral-900/50 border-neutral-700 text-white h-12 mb-4 rounded-xl" 
               />
               <Button 
                 onClick={handleStartMatching} 
                 className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-lg shadow-lg"
               >
                 Start Matching ✨
               </Button>
            </div>
         </div>
      )}

      {/* 2. SEARCHING / LOADING */}
      {(step === 'searching' || step === 'loading_video') && (
         <div className="relative z-10 h-full flex flex-col items-center justify-center">
            <div className="glass-card p-8 rounded-full mb-6 animate-pulse">
               <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white">
               {step === 'searching' ? "Finding a partner..." : "Connecting Video..."}
            </h2>
            <Button variant="outline" className="mt-8 border-neutral-700 text-neutral-400 hover:text-white" onClick={() => window.location.reload()}>Cancel</Button>
         </div>
      )}

      {/* 3. VIDEO ROOM (LiveKit + Chat) */}
      {step === 'video' && token && (
        <div className="h-full flex flex-col md:flex-row bg-black relative z-10">
           
           {/* LEFT: LIVEKIT VIDEO AREA */}
           <div className="flex-1 relative bg-neutral-900">
              <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={LIVEKIT_URL}
                connect={true}
                data-lk-theme="default"
                style={{ height: '100%' }}
              >
                {/* Auto Grid Layout (Handles 1-on-1 or Group) */}
                <VideoConference />
                
                {/* Default Controls (Mute/Video/ScreenShare) */}
                <ControlBar /> 
                
                <RoomAudioRenderer />
              </LiveKitRoom>

              {/* CUSTOM NEXT BUTTON OVERLAY */}
              <div className="absfolute bottom-24 left-1/2 transform -translate-x-1/2 z-50">
                 <Button 
                    onClick={handleNext} 
                    className="bg-white text-black hover:bg-neutral-200 font-bold px-8 py-6 rounded-full text-xl shadow-2xl transition-transform hover:scale-105"
                 >
                    <SkipForward className="mr-2 w-6 h-6" /> NEXT MATCH
                 </Button>
              </div>
           </div>

           {/* RIGHT: CHAT AREA */}
           <div className="w-full md:w-96 bg-neutral-950 border-l border-neutral-800 flex flex-col h-1/3 md:h-full glass-card border-l-0 rounded-none">
              <div className="p-4 border-b border-white/10 font-semibold flex items-center gap-2 bg-white/5">
                 <MessageSquare className="w-4 h-4 text-blue-500" /> Live Chat
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${m.sender === 'me' ? 'bg-blue-600 text-white' : m.sender === 'system' ? 'text-neutral-500 text-xs w-full text-center bg-transparent' : 'bg-neutral-800 text-neutral-200'}`}>
                          {m.text}
                       </div>
                    </div>
                 ))}
                 <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-white/10 flex gap-2 bg-white/5">
                 <Input value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} placeholder="Type a message..." className="bg-neutral-900 border-neutral-700 text-white" />
                 <Button type="submit" size="icon" className="bg-blue-600"><Send className="w-4 h-4" /></Button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;