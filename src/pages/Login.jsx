import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  const handleLogin = () => {
    // Abhi ke liye seedha video chat par bhej dete hain (Backend baad mein jodenge)
    navigate('/chat'); 
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-neutral-950 overflow-hidden text-white font-sans">
      
      {/* Background Blobs */}
      <div className="absolute top-0 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md mx-4">
        <h2 className="text-3xl font-bold text-center mb-6 text-white">Welcome Back 👋</h2>
        
        <div className="space-y-4">
          <Input placeholder="College Email" className="bg-white/10 border-white/10 text-white h-12 rounded-xl" />
          <Input type="password" placeholder="Password" className="bg-white/10 border-white/10 text-white h-12 rounded-xl" />
          
          <Button onClick={handleLogin} className="w-full h-12 bg-white text-black hover:bg-neutral-200 font-bold rounded-xl text-lg mt-4">
            Log In
          </Button>
        </div>

        <p className="mt-6 text-center text-neutral-400 text-sm">
          New here? <Link to="/signup" className="text-purple-400 hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;