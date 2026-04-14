import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AuthBackground from "@/components/auth/AuthBackground";
import AuthCard from "@/components/auth/AuthCard";
import AuthInput from "@/components/auth/AuthInput";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Please enter your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center font-sans">
      <AuthBackground />
      <motion.div className="relative z-10 w-full px-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <AuthCard>
          <div className="space-y-5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center">
                <span className="text-sm font-bold bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">W</span>
              </div>
              <span className="text-white/80 font-semibold text-sm tracking-wide">smartB AI</span>
            </div>

            {sent ? (
              <motion.div className="text-center space-y-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="flex justify-center">
                  <CheckCircle className="w-12 h-12 text-[hsl(153,30%,48%)]" />
                </div>
                <h1 className="text-xl font-bold text-white">Check your inbox</h1>
                <p className="text-xs text-white/60">We've sent a password reset link to <span className="text-white/80">{email}</span></p>
                <Link to="/signin" className="inline-block text-sm text-white/70 hover:text-white underline-offset-4 hover:underline transition-colors">
                  Back to Sign In
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="text-center space-y-1">
                  <h1 className="text-xl font-bold bg-gradient-to-b from-white to-white/80 bg-clip-text text-transparent">Forgot Password</h1>
                  <p className="text-xs text-white/60">Enter your email to receive a reset link</p>
                </div>

                <AuthInput icon={Mail} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />

                <motion.button
                  type="submit"
                  disabled={loading}
                  className="relative w-full bg-white text-black font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading && (
                    <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send Reset Link <ArrowRight className="w-4 h-4" /></>}
                  </span>
                </motion.button>

                <p className="text-center text-xs text-white/50">
                  <Link to="/signin" className="text-white/80 hover:text-white underline-offset-4 hover:underline transition-colors">Back to Sign In</Link>
                </p>
              </form>
            )}
          </div>
        </AuthCard>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
