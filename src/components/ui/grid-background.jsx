import React from "react";

// Ye utility function Shadcn ne banaya tha, hum use reuse kar rahe hain
import { cn } from "@/lib/utils";

export function GridBackground({
  children,
  className,
  containerClassName
}) {
  return (
    (<div
      className={cn(
       // Line kuch aisi dikhni chahiye change ke baad:
"h-full w-full dark:bg-neutral-950 bg-white dark:bg-grid-white/[0.05] bg-grid-black/[0.05]      relative flex items-center justify-center",
        containerClassName
      )}>
      {/* Radial gradient for the moving spotlight effect */}
      {/* Ye jo "pointer-events-none" wala div hai, ye wo ghumne wali light hai */}
      <div
        className="absolute pointer-events-none inset-0 flex items-center justify-center dark:bg-neutral-950 bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]"></div>
      
      {/* Jo bhi content hum iske andar dalenge (humara Login Card) wo yahan aayega */}
      <div className={cn("relative z-20", className)}>{children}</div>
    </div>)
  );
}