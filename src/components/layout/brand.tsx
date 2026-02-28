import Image from "next/image";

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 bg-zinc-900 rounded-xl p-1.5 border border-white/10">
        <Image 
          src="/logo.png" 
          alt="SweetSpot Logo" 
          width={40} 
          height={40} 
          className="object-contain" 
        />
      </div>
      <div className="flex flex-col">
        <h1 className="text-white font-black text-2xl italic tracking-tighter uppercase leading-none">
          Sweet<span className="text-primary">Spot</span>
        </h1>
        <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-1">
          Intelligence
        </p>
      </div>
    </div>
  );
}