import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';

const Signup = () => {
  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-neutral-950 overflow-hidden text-white font-sans">
      
      {/* ANIMATED BACKGROUND */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

      {/* GLASS CARD */}
      <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md mx-4">
        <h2 className="text-3xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Create Account</h2>
        <p className="text-neutral-400 text-center mb-8">Join the campus network</p>

        <div className="space-y-4">
          <Input placeholder="Full Name" className="bg-white/10 border-white/10 text-white placeholder:text-neutral-500 h-12 rounded-xl" />
          <Input placeholder="College Email (.edu)" className="bg-white/10 border-white/10 text-white placeholder:text-neutral-500 h-12 rounded-xl" />
          <Input type="password" placeholder="Password" className="bg-white/10 border-white/10 text-white placeholder:text-neutral-500 h-12 rounded-xl" />
          
          <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl text-lg mt-4 shadow-lg">
            Sign Up 🚀
          </Button>
        </div>

        <p className="mt-6 text-center text-neutral-400 text-sm">
          Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;