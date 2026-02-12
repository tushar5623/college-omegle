import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, MicOff, Video as VideoIcon, VideoOff, Send, MessageSquare, SkipForward } from 'lucide-react';
import { GridBackground } from "@/components/ui/grid-background";
import { io } from "socket.io-client";
import SimplePeer from 'simple-peer';

// --- APNA RENDER URL YAHAN DALO ---
const socket = io("https://college-omegle-backend.onrender.com");

function App() {
  const [step, setStep] = useState('landing'); 
  const [email, setEmail] = useState("");
  const [roomID, setRoomID] = useState(null);
  const [stream, setStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");
  const [partnerActive, setPartnerActive] = useState(false); // Partner zinda hai ya nahi

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

    // 4. PARTNER NE 'NEXT' DABAYA YA BHAAG GAYA
    socket.on("partner-left", () => {
      setPartnerActive(false); // Video band karo
      setMessages((prev) => [...prev, { sender: 'system', text: 'Partner has disconnected.' }]);
      if (partnerVideo.current) partnerVideo.current.srcObject = null;
      
      // Optional: Agar automatic next chahiye toh yahan handleNext() call kar do
    });

    return () => {
      socket.off("match-found");
      socket.off("signal");
      socket.off("receive-message");
      socket.off("partner-left");
    };
  }, []);

  // --- 🔥 MAGIC FUNCTION: NEXT BUTTON ---
  const handleNext = () => {
    // 1. Purana connection kaato
    if (connectionRef.current) {
      connectionRef.current.destroy();
      connectionRef.current = null;
    }

    // 2. State reset karo
    setStep('searching'); // Wapas searching screen par
    setMessages([]);
    setPartnerActive(false);
    setRoomID(null);
    incomingSignal.current = null;

    // 3. Server ko bolo "Main jaa raha hu"
    socket.emit("skip-partner");

    // 4. Thoda sa ruk kar wapas Join karo (Smooth transition ke liye)
    setTimeout(() => {
        socket.emit("join-room", email);
    }, 500);
  };
  // -------------------------------------

  const startCall = (room, stream, initiator) => {
    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false, 
      stream: stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ]
      }
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
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        window.localStream = currentStream; 
        if (myVideo.current) myVideo.current.srcObject = currentStream;
        setStep('searching'); 
        socket.emit("join-room", email);
      })
      .catch((err) => alert("Camera permission denied!"));
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages((prev) => [...prev, { sender: 'me', text: inputMsg }]);
    socket.emit("send-message", { room: roomID, message: inputMsg });
    setInputMsg("");
  };

  return (
    <div className="h-screen w-full bg-neutral-950 text-white overflow-hidden font-sans">
      
      {/* 1. LANDING */}
      {step === 'landing' && (
         <div className="h-full flex flex-col items-center justify-center p-6 bg-grid-white/[0.02]">
            <h1 className="text-6xl font-bold mb-8 text-blue-500">College Omegle</h1>
            <div className="bg-neutral-900 p-8 rounded-2xl w-full max-w-md border border-neutral-800">
               <Input placeholder="Enter College Email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 bg-black text-white" />
               <Button onClick={handleStartMatching} className="w-full bg-white text-black font-bold">Start Video Chat</Button>
            </div>
         </div>
      )}

      {/* 2. SEARCHING */}
      {step === 'searching' && (
         <div className="h-full flex flex-col items-center justify-center bg-black">
            <div className="w-64 h-48 bg-neutral-900 rounded-xl overflow-hidden mb-8 border border-neutral-800">
               <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
            </div>
            <h2 className="text-2xl font-bold flex gap-2 animate-pulse text-white">
               <Loader2 className="animate-spin text-blue-500" /> Finding Partner...
            </h2>
            <Button variant="outline" className="mt-8 border-neutral-700 text-white" onClick={() => window.location.reload()}>Cancel</Button>
         </div>
      )}

      {/* 3. VIDEO ROOM */}
      {step === 'video' && (
        <div className="h-full flex flex-col md:flex-row bg-black">
           
           {/* VIDEO AREA */}
           <div className="flex-1 relative bg-neutral-900 flex items-center justify-center">
              {partnerActive ? (
                  <video playsInline ref={partnerVideo} autoPlay className="w-full h-full object-contain" />
              ) : (
                  <div className="text-neutral-500 text-xl">Partner Disconnected... Press Next</div>
              )}
              
              <div className="absolute top-4 right-4 w-32 h-24 bg-neutral-800 rounded-lg overflow-hidden border border-white/20">
                 <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
              </div>

              {/* NEXT BUTTON */}
              <div className="absolute bottom-8 flex gap-4">
                 <Button 
                    onClick={handleNext} 
                    className="bg-white text-black font-bold px-8 py-6 rounded-full text-xl hover:bg-neutral-200 shadow-xl"
                 >
                    <SkipForward className="mr-2 w-6 h-6" /> NEXT MATCH
                 </Button>
              </div>
           </div>

           {/* CHAT AREA */}
           <div className="w-full md:w-96 bg-neutral-950 border-l border-neutral-800 flex flex-col">
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
              <form onSubmit={sendMessage} className="p-3 border-t border-neutral-800 flex gap-2">
                 <Input value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} placeholder="Type a message..." className="bg-neutral-900 text-white border-none" />
                 <Button type="submit" size="icon" className="bg-blue-600"><Send className="w-4 h-4" /></Button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;