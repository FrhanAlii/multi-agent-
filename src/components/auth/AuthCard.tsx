import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

interface AuthCardProps {
  children: ReactNode;
}

const AuthCard = ({ children }: AuthCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    setIsHovered(false);
  };

  return (
    <div style={{ perspective: 1500 }}>
      <motion.div
        ref={cardRef}
        className="relative w-full max-w-sm mx-auto rounded-2xl bg-black/40 backdrop-blur-xl border border-white/[0.05] p-8 overflow-hidden"
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        animate={{ z: isHovered ? 20 : 0 }}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        transition={{ z: { duration: 0.3 } }}
      >
        {/* Traveling light beams */}
        <motion.div
          className="absolute top-0 left-0 w-20 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{ x: ["-80px", "400px"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-20 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent"
          animate={{ x: ["400px", "-80px"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1.5, repeatDelay: 1 }}
        />
        <motion.div
          className="absolute top-0 right-0 w-[1px] h-20 bg-gradient-to-b from-transparent via-white/40 to-transparent"
          animate={{ y: ["-80px", "500px"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 0.75, repeatDelay: 1 }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[1px] h-20 bg-gradient-to-b from-transparent via-white/40 to-transparent"
          animate={{ y: ["500px", "-80px"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 2.25, repeatDelay: 1 }}
        />

        {/* Corner dots */}
        {[
          "top-0 left-0",
          "top-0 right-0",
          "bottom-0 left-0",
          "bottom-0 right-0",
        ].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-1 h-1 rounded-full bg-white/30`}
          />
        ))}

        {children}
      </motion.div>
    </div>
  );
};

export default AuthCard;
