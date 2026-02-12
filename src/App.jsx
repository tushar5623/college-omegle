import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, SkipForward, Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { io } from "socket.io-client";
import SimplePeer from 'simple-peer';

// --- CONFIGURATION ---
const BACKEND_URL = "https://college-omegle-backend.onrender.com";
const socket = io(BACKEND_URL);

function App() {
  const [step, setStep] = useState('landing'); 
  const [email, setEmail] = useState("");
  const [roomID, setRoomID] = useState(null);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [partnerActive, setPartnerActive] = useState(false);

  const myVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();
  const incomingSignal = useRef(null);
  const chatEndRef = useRef(null); 

  useEffect(() => {
    // 1. MATCH FOUND
    socket.on("match-found", (data) => {
      console.log("✅ Match Found:", data.roomID);
      setRoomID(data.roomID);
      setStep('video');
      setMessages([]); 
      setPartnerActive(true);
      
      const isInitiator = socket.id < data.partnerID; 
      
      // Stream hai toh call start karo
      if(window.localStream) {
          startCall(data.roomID, window.localStream, isInitiator);
      }
    });

    // 2. SIGNAL AAYA
    socket.on("signal", (data) => {
      if (connectionRef.current && !connectionRef.current.destroyed) {
        connectionRef.current.signal(data.signal);
      } else {
        incomingSignal.current = data.signal;
      }
    });

    // 3. MESSAGE AAYA
    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, { sender: 'stranger', text: msg }]);
    });

    // 4. PARTNER LEFT
    socket.on("partner-left", () => {
      setPartnerActive(false); 
      setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected.' }]);
      if (partnerVideo.current) partnerVideo.current.srcObject = null;
      if (connectionRef.current) connectionRef.current.destroy();
    });

    return () => {
      socket.off("match-found");
      socket.off("signal");
      socket.off("receive-message");
      socket.off("partner-left");
    };
  }, []);

  // --- LOGIC FUNCTIONS ---
  const startCall = (room, stream, initiator) => {
    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false, 
      stream: stream,
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }
    });

    peer.on("signal", (data) => {
      socket.emit("signal", { room, signal: data });
    });

    peer.on("stream", (remoteStream) => {
      if (partnerVideo.current) partnerVideo.current.srcObject = remoteStream;
    });

    if (incomingSignal.current && !initiator) {
        peer.signal(incomingSignal.current);
        incomingSignal.current = null;
    }

    connectionRef.current = peer;
  };

  const handleStartMatching = () => {
    if (!email) return alert("Please enter college email!");
    
    // --- YAHAN CAMERA PERMISSION MANGEGA ---
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        window.localStream = currentStream; 
        if (myVideo.current) myVideo.current.srcObject = currentStream;
        
        setStep('searching'); 
        socket.emit("join-room", email);
      })
      .catch((err) => {
        console.error(err);
        alert("Camera permission denied! Check browser settings.");
      });
  };

  const handleNext = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    setStep('searching'); 
    setMessages([]);
    setPartnerActive(false);
    setRoomID(null);
    incomingSignal.current = null;

    socket.emit("skip-partner");

    setTimeout(() => {
        socket.emit("join-room", email);
    }, 500);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages((prev) => [...prev, { sender: 'me', text: inputMsg }]);
    socket.emit("send-message", { room: roomID, message: inputMsg });
    setInputMsg("");
  };

  // --- RENDER UI ---
  return (
    <div className="h-screen w-full bg-neutral-950 text-white overflow-hidden font-sans relative">
      
      {/* BACKGROUND ANIMATION */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob pointer-events-none"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>

      {/* 1. LANDING PAGE */}
      {step === 'landing' && (
         <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">
            <div className="glass-card p-10 rounded-3xl w-full max-w-lg text-center border border-white/10 shadow-2xl">
               <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                 College Omegle
               </h1>
               <p className="text-neutral-400 mb-8">Connect with random students instantly.</p>
               <Input placeholder="Enter College Email ID" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900/50 border-neutral-700 text-white h-12 mb-4 rounded-xl" />
               <Button onClick={handleStartMatching} className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-lg shadow-lg">
                 Start Video Chat 🎥
               </Button>
            </div>
         </div>
      )}

      {/* 2. SEARCHING */}
      {step === 'searching' && (
         <div className="relative z-10 h-full flex flex-col items-center justify-center">
            {/* My Video Preview */}
            <div className="w-64 h-48 bg-neutral-900 rounded-2xl overflow-hidden mb-8 border border-white/10 shadow-2xl relative">
               <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
            </div>
            <h2 className="text-2xl font-bold flex gap-2 animate-pulse text-white">
               <Loader2 className="animate-spin text-blue-500" /> Finding Partner...
            </h2>
            <Button variant="outline" className="mt-8 border-neutral-700 text-neutral-400 hover:text-white" onClick={() => window.location.reload()}>Cancel</Button>
         </div>
      )}

      {/* 3. VIDEO ROOM */}
      {step === 'video' && (
        <div className="h-full flex flex-col md:flex-row bg-black relative z-10">
           
           {/* VIDEO AREA */}
           <div className="flex-1 relative bg-neutral-900 flex items-center justify-center">
              {partnerActive ? (
                  <video playsInline ref={partnerVideo} autoPlay className="w-full h-full object-contain" />
              ) : (
                  <div className="text-neutral-500 text-xl animate-bounce">Partner Disconnected...</div>
              )}
              
              {/* My Video (PIP) */}
              <div className="absolute top-4 right-4 w-32 h-24 bg-neutral-800 rounded-lg overflow-hidden border border-white/20 shadow-lg">
                 <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
              </div>

              {/* NEXT BUTTON */}
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
                 <Button onClick={handleNext} className="bg-white text-black hover:bg-neutral-200 font-bold px-8 py-6 rounded-full text-xl shadow-2xl transition-transform hover:scale-105">
                    <SkipForward className="mr-2 w-6 h-6" /> NEXT MATCH
                 </Button>
              </div>
           </div>

           {/* CHAT AREA */}
           <div className="w-full md:w-96 bg-neutral-950 border-l border-neutral-800 flex flex-col glass-card border-l-0 rounded-none h-1/3 md:h-full">
              <div className="p-4 border-b border-white/10 font-semibold flex items-center gap-2 bg-white/5">
                  <MessageSquare className="w-4 h-4 text-blue-500"/> Chat
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`px-4 py-2 rounded-2xl text-sm ${m.sender === 'me' ? 'bg-blue-600' : 'bg-neutral-800'}`}>
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