import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check for recovery type in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      navigate("/signin");
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully!" });
      navigate("/dashboard");
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans">
      <AuthBackground />
      <motion.div className="relative z-10 w-full px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <AuthCard>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center">
                <span className="text-sm font-bold bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">W</span>
              </div>
              <span className="text-white/80 font-semibold text-sm tracking-wide">smartB AI</span>
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-xl font-bold bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">Set New Password</h1>
              <p className="text-xs text-white/60">Enter your new password below</p>
            </div>
            <div className="space-y-3">
              <AuthInput icon={Lock} isPassword placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <AuthInput icon={Lock} isPassword placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              {confirmPassword && password !== confirmPassword && <p className="text-[11px] text-red-400">Passwords do not match</p>}
            </div>
            <motion.button type="submit" disabled={loading} className="relative w-full bg-white text-black font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <span className="relative z-10 flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Update Password <ArrowRight className="w-4 h-4" /></>}
              </span>
            </motion.button>
          </form>
        </AuthCard>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
