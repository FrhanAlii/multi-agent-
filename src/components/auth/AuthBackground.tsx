import { motion } from "framer-motion";

const AuthBackground = () => (
  <div className="fixed inset-0 bg-black overflow-hidden">
    {/* Gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-[hsl(153,48%,19%)]/60 via-[hsl(153,38%,36%)]/50 to-black" />

    {/* Noise texture */}
    <div
      className="absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />

    {/* Pulsing glow spots */}
    <motion.div
      className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(153,48%,19%) 0%, transparent 70%)",
      }}
      animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
      style={{
        background: "radial-gradient(circle, hsl(153,30%,48%) 0%, transparent 70%)",
      }}
      animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.15, 1] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

export default AuthBackground;
