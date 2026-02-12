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
  const [connectionStatus, setConnectionStatus] = useState(""); // New: Status dikhane ke liye

  const myVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();
  const incomingSignal = useRef(null);
  const chatEndRef = useRef(null); 

  useEffect(() => {
    socket.on("match-found", (data) => {
      console.log("✅ Match Found:", data.roomID);
      setRoomID(data.roomID);
      setStep('video');
      setMessages([]); 
      setPartnerActive(true);
      setConnectionStatus("Connecting to Partner..."); // Status update
      
      const isInitiator = socket.id < data.partnerID; 
      if(window.localStream) {
          startCall(data.roomID, window.localStream, isInitiator);
      }
    });

    socket.on("signal", (data) => {
      if (connectionRef.current && !connectionRef.current.destroyed) {
        connectionRef.current.signal(data.signal);
      } else {
        incomingSignal.current = data.signal;
      }
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, { sender: 'stranger', text: msg }]);
    });

    socket.on("partner-left", () => {
      setPartnerActive(false); 
      setConnectionStatus("Partner Left.");
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
      console.log("🌊 Stream Received!");
      setConnectionStatus("Connected!"); // Video aa gayi!
      if (partnerVideo.current) partnerVideo.current.srcObject = remoteStream;
    });
    
    // ERROR HANDLING ADDED
    peer.on("error", (err) => {
        console.error("Peer Error:", err);
        setConnectionStatus("Connection Failed (Try same WiFi)");
    });

    if (incomingSignal.current && !initiator) {
        peer.signal(incomingSignal.current);
        incomingSignal.current = null;
    }

    connectionRef.current = peer;
  };

  const handleStartMatching = () => {
    if (!email) return alert("Please enter college email!");
    
    // Echo Cancellation ON
    navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: { echoCancellation: true, noiseSuppression: true } 
    })
      .then((currentStream) => {
        setStream(currentStream);
        window.localStream = currentStream; 
        if (myVideo.current) myVideo.current.srcObject = currentStream;
        setStep('searching'); 
        socket.emit("join-room", email);
      })
      .catch((err) => alert("Camera blocked! Allow permission."));
  };

  const handleNext = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }
    setStep('searching'); 
    setMessages([]);
    setPartnerActive(false);
    setConnectionStatus("");
    setRoomID(null);
    incomingSignal.current = null;
    socket.emit("skip-partner");
    setTimeout(() => { socket.emit("join-room", email); }, 500);
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
      
      {/* 1. LANDING PAGE */}
      {step === 'landing' && (
         <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6">
            <div className="glass-card p-10 rounded-3xl w-full max-w-lg text-center border border-white/10 shadow-2xl bg-white/5 backdrop-blur-lg">
               <h1 className="text-5xl font-extrabold mb-4 text-blue-500">College Omegle</h1>
               <p className="text-neutral-400 mb-8">Connect with random students instantly.</p>
               <Input placeholder="Enter College Email ID" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-900/50 border-neutral-700 text-white h-12 mb-4 rounded-xl" />
               <Button onClick={handleStartMatching} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg shadow-lg">Start Video Chat 🎥</Button>
            </div>
         </div>
      )}

      {/* 2. SEARCHING */}
      {step === 'searching' && (
         <div className="relative z-10 h-full flex flex-col items-center justify-center">
            <div className="w-64 h-48 bg-neutral-900 rounded-2xl overflow-hidden mb-8 border border-white/10 shadow-2xl relative">
               <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
            </div>
            <h2 className="text-2xl font-bold flex gap-2 animate-pulse text-white"><Loader2 className="animate-spin text-blue-500" /> Finding Partner...</h2>
         </div>
      )}

      {/* 3. VIDEO ROOM */}
      {step === 'video' && (
        <div className="h-full flex flex-col md:flex-row bg-black relative z-10">
           
           {/* VIDEO AREA */}
           <div className="flex-1 relative bg-neutral-900 flex items-center justify-center p-4">
              
              {/* PARTNER VIDEO FRAME (Ab Black nahi dikhega) */}
              <div className="relative w-full h-full max-w-4xl max-h-[80vh] bg-neutral-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center">
                  {partnerActive ? (
                      <>
                        {/* Video Element */}
                        <video playsInline ref={partnerVideo} autoPlay className="w-full h-full object-contain relative z-10" />
                        
                        {/* Waiting Text (Video ke peeche) */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-0">
                            <Loader2 className="w-12 h-12 text-neutral-500 animate-spin mb-4" />
                            <p className="text-neutral-400 text-lg">{connectionStatus || "Waiting for stream..."}</p>
                        </div>
                      </>
                  ) : (
                      <div className="text-neutral-500 text-xl">Partner Disconnected...</div>
                  )}
              </div>
              
              {/* MY VIDEO (PIP) - Top Right Corner */}
              <div className="absolute top-8 right-8 w-40 h-28 bg-black rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
                 <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
              </div>

              {/* NEXT BUTTON */}
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-30">
                 <Button onClick={handleNext} className="bg-white text-black hover:bg-neutral-200 font-bold px-8 py-6 rounded-full text-xl shadow-2xl hover:scale-105 transition-transform">
                    <SkipForward className="mr-2 w-6 h-6" /> NEXT MATCH
                 </Button>
              </div>
           </div>

           {/* CHAT AREA */}
           <div className="w-full md:w-96 bg-neutral-950 border-l border-neutral-800 flex flex-col h-1/3 md:h-full">
              <div className="p-4 border-b border-white/10 font-semibold flex items-center gap-2 bg-white/5"><MessageSquare className="w-4 h-4 text-blue-500"/> Chat</div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`px-4 py-2 rounded-2xl text-sm ${m.sender === 'me' ? 'bg-blue-600' : 'bg-neutral-800'}`}>{m.text}</div>
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