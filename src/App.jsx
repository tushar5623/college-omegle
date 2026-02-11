import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Send, MessageSquare, ShieldCheck } from 'lucide-react';
import { GridBackground } from "@/components/ui/grid-background";
import { io } from "socket.io-client";
import SimplePeer from 'simple-peer';

// --- YOUR RENDER BACKEND URL ---
const socket = io("https://college-omegle-backend.onrender.com");

function App() {
  const [step, setStep] = useState('landing'); 
  const [email, setEmail] = useState("");
  const [roomID, setRoomID] = useState(null);
  
  const [stream, setStream] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState("");

  const myVideo = useRef();
  const partnerVideo = useRef();
  const connectionRef = useRef();
  const chatEndRef = useRef(null); 
  
  // --- FIX: Store signal if it arrives early ---
  const incomingSignal = useRef(null);

  useEffect(() => {
    socket.on("match-found", (data) => {
      console.log("Match Found! Room:", data.roomID);
      setRoomID(data.roomID);
      setStep('video');
      setMessages([]); 
      
      const isInitiator = socket.id < data.partnerID; 
      
      // --- FIX: No Timeout! Start immediately if stream exists ---
      if(window.localStream) {
          startCall(data.roomID, window.localStream, isInitiator);
      } else {
          // Fallback: Agar stream nahi hai (Rare case), toh get karo
          navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((s) => {
             setStream(s);
             window.localStream = s;
             startCall(data.roomID, s, isInitiator);
          });
      }
    });

    socket.on("signal", (data) => {
      // Case 1: Agar Peer ready hai, toh signal de do
      if (connectionRef.current && !connectionRef.current.destroyed) {
        connectionRef.current.signal(data.signal);
      } 
      // Case 2: Agar Peer ready nahi hai (Early Signal), toh save kar lo
      else {
        incomingSignal.current = data.signal;
      }
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, { sender: 'stranger', text: msg }]);
    });

    return () => {
      socket.off("match-found");
      socket.off("signal");
      socket.off("receive-message");
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages((prev) => [...prev, { sender: 'me', text: inputMsg }]);
    socket.emit("send-message", { room: roomID, message: inputMsg });
    setInputMsg("");
  };

  const startCall = (room, stream, initiator) => {
    const peer = new SimplePeer({
      initiator: initiator,
      trickle: false, 
      stream: stream,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
          // OpenRelay TURN Servers
           {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
          {
            urls: "turn:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject",
          },
        ]
      }
    });

    peer.on("signal", (data) => {
      socket.emit("signal", { room, signal: data });
    });

    peer.on("stream", (remoteStream) => {
      console.log("Stream received!");
      if (partnerVideo.current) partnerVideo.current.srcObject = remoteStream;
    });

    peer.on("error", (err) => {
       console.error("Peer Error:", err);
    });

    // --- FIX: Check if we have a saved signal waiting ---
    if (incomingSignal.current && !initiator) {
        console.log("Processing saved signal...");
        peer.signal(incomingSignal.current);
        incomingSignal.current = null; // Clear it
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
        setStep('waiting');
        socket.emit("join-room", email);
      })
      .catch((err) => alert("Camera access denied! Check permissions."));
  };

  const toggleMic = () => {
    setMicOn(!micOn);
    if(stream) stream.getAudioTracks()[0].enabled = !micOn;
  };
  const toggleCamera = () => {
    setCameraOn(!cameraOn);
    if(stream) stream.getVideoTracks()[0].enabled = !cameraOn;
  };

  return (
    <div className="h-screen w-full bg-neutral-950 text-white overflow-hidden font-sans">
      
      {/* 1. LANDING & WAITING */}
      {step !== 'video' && (
        <GridBackground containerClassName="h-full w-full absolute top-0 left-0 z-0">
          
          {step === 'landing' ? (
             <div className="relative z-10 w-full max-w-7xl mx-auto px-6 h-full flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-12">
                <div className="flex-1 text-center lg:text-left space-y-8 mt-10 lg:mt-0">
                  <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight">
                    Connect with <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">Campus Peers.</span>
                  </h1>
                </div>
                <div className="w-full max-w-md">
                  <div className="bg-neutral-900/50 border border-neutral-800 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative">
                      <h2 className="text-2xl font-bold text-white mb-6">Get Started</h2>
                      <Input placeholder="student@college.edu" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-neutral-950 border-neutral-800 text-white h-12 mb-4" />
                      <Button onClick={handleStartMatching} className="w-full h-12 bg-white text-black hover:bg-neutral-200 font-bold text-base transition-all">Start Matching</Button>
                  </div>
                </div>
             </div>
          ) : (
             <div className="h-full flex flex-col items-center justify-center relative z-10">
                <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse -z-10"></div>
                <div className="relative w-64 h-48 bg-black rounded-xl overflow-hidden mb-8 border-2 border-blue-500/30 shadow-2xl">
                   <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
                </div>
                <h2 className="text-2xl font-bold flex gap-2 items-center"><Loader2 className="animate-spin text-blue-500" /> Searching...</h2>
                <Button variant="outline" className="mt-6 border-neutral-700 hover:bg-neutral-800" onClick={() => window.location.reload()}>Cancel</Button>
             </div>
          )}
        </GridBackground>
      )}

      {/* 2. VIDEO + CHAT ROOM */}
      {step === 'video' && (
        <div className="h-full flex flex-col md:flex-row bg-black">
           
           {/* LEFT: VIDEO SECTION */}
           <div className="flex-1 relative bg-neutral-900 flex items-center justify-center">
              {/* Partner Video - Added playsInline and muted for mobile auto-play policy */}
              <video playsInline ref={partnerVideo} autoPlay className="w-full h-full object-contain" />
              
              <div className="absolute top-4 right-4 w-32 h-24 md:w-48 md:h-36 bg-neutral-800 rounded-lg border border-white/10 overflow-hidden shadow-2xl z-20">
                 <video playsInline muted ref={(ref) => { if(ref) ref.srcObject = stream }} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
              </div>

              <div className="absolute bottom-6 flex gap-4 z-30 bg-black/50 px-6 py-3 rounded-full backdrop-blur-md border border-white/10">
                 <Button size="icon" className="rounded-full bg-neutral-800" onClick={toggleMic}>{micOn ? <Mic /> : <MicOff className="text-red-500" />}</Button>
                 <Button size="icon" className="rounded-full bg-red-600 hover:bg-red-700" onClick={() => window.location.reload()}><PhoneOff /></Button>
                 <Button size="icon" className="rounded-full bg-neutral-800" onClick={toggleCamera}>{cameraOn ? <VideoIcon /> : <VideoOff className="text-red-500" />}</Button>
              </div>
           </div>

           {/* RIGHT: CHAT SECTION */}
           <div className="w-full md:w-96 bg-neutral-950 border-l border-neutral-800 flex flex-col h-1/3 md:h-full">
              <div className="p-4 border-b border-neutral-800 font-semibold flex items-center gap-2 bg-neutral-900">
                 <MessageSquare className="w-4 h-4 text-blue-500" /> Live Chat
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${m.sender === 'me' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-200'}`}>
                          {m.text}
                       </div>
                    </div>
                 ))}
                 <div ref={chatEndRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-neutral-800 flex gap-2 bg-neutral-900">
                 <Input value={inputMsg} onChange={(e) => setInputMsg(e.target.value)} placeholder="Type a message..." className="bg-neutral-950 border-neutral-700 text-white" />
                 <Button type="submit" size="icon" className="bg-blue-600"><Send className="w-4 h-4" /></Button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;