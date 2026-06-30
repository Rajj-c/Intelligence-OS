import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Loader2, KeyRound, Lock, Mail, ArrowRight, ArrowLeft, LogIn, UserPlus, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createConfirmedGuestUser, checkUserExists } from "@/lib/candidates.functions";
import { motion } from "framer-motion";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TalentOS" }] }),
  component: LoginPage,
});

type AuthMode = "select" | "signin" | "signup" | "forgot";
type AuthStep = "initial" | "otp" | "password_setup" | "success";

function getFriendlyError(error: any): string {
  if (!error) return "";
  const msg = error.message || "";
  if (msg === "{}" || error.status === 500 || msg.includes("fetch") || msg.toLowerCase().includes("smtp")) {
    return "SMTP Error: Supabase could not send the email. If you set up Resend's free tier, you can only send emails to the email address you registered with on resend.com. Verify a custom domain in Resend to send to other addresses.";
  }
  return msg || String(error);
}

function LoginPage() {
  const navigate = useNavigate();
  const createGuestFn = useServerFn(createConfirmedGuestUser);
  const checkExistsFn = useServerFn(checkUserExists);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [mode, setMode] = useState<AuthMode>("select");
  const [step, setStep] = useState<AuthStep>("initial");
  const [loading, setLoading] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Redirect if already logged in or if landing from password reset link
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // If they landed with ?reset=true in the URL, redirect to password configuration
        const params = new URLSearchParams(window.location.search);
        if (params.get("reset") === "true") {
          setMode("signup");
          setStep("password_setup");
          toast.info("Please set a new password to secure your account.");
        } else {
          navigate({ to: "/dashboard" });
        }
      }
    });
  }, [navigate]);

  // Reset states when mode changes
  useEffect(() => {
    setStep("initial");
    setPassword("");
    setConfirmPassword("");
    setOtp("");
    setErrorText("");
  }, [mode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setLoading(true);
    setErrorText("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data.session) {
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (error: any) {
      const friendly = getFriendlyError(error);
      setErrorText(friendly);
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email) {
      toast.error("Please enter email address");
      return;
    }
    setLoading(true);
    setErrorText("");
    try {
      const { exists } = await checkExistsFn({ data: { email } });
      if (exists) {
        throw new Error("Your account exists already. Please try to sign in.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      toast.success("Verification code sent to your email!");
      setStep("otp");
    } catch (error: any) {
      const friendly = getFriendlyError(error);
      setErrorText(friendly);
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    setErrorText("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      if (error) throw error;
      
      if (data.session) {
        toast.success("Email verified successfully!");
        setStep("password_setup");
      } else {
        throw new Error("Verification succeeded but no session was created");
      }
    } catch (error: any) {
      const friendly = getFriendlyError(error);
      setErrorText(friendly);
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    setErrorText("");
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });
      if (error) throw error;
      
      toast.success("Password configured successfully!");
      setStep("success");
      
      // Delay redirection for animation
      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 3800);
    } catch (error: any) {
      const friendly = getFriendlyError(error);
      setErrorText(friendly);
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter email address");
      return;
    }
    setLoading(true);
    setErrorText("");
    try {
      const { exists } = await checkExistsFn({ data: { email } });
      if (!exists) {
        throw new Error("Looks like your account doesn't exist, try to sign up");
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/login?reset=true",
      });
      if (error) throw error;
      toast.success("Reset link sent successfully!");
      setErrorText("Success: Check your inbox for a password reset email link.");
    } catch (error: any) {
      const friendly = getFriendlyError(error);
      setErrorText(friendly);
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoadingGuest(true);
    setErrorText("");
    try {
      // 1. Provision pre-confirmed guest user on the backend
      await createGuestFn();

      // 2. Perform regular sign in for guest account
      const guestEmail = "guest@talentos.com";
      const guestPassword = "GuestPassword123!";
      const { data, error } = await supabase.auth.signInWithPassword({
        email: guestEmail,
        password: guestPassword,
      });
      if (error) throw error;

      if (data.session) {
        toast.success("Logged in as Guest!");
        navigate({ to: "/dashboard" });
      }
    } catch (e: any) {
      const friendly = getFriendlyError(e);
      setErrorText(friendly);
      toast.error(friendly);
    } finally {
      setLoadingGuest(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <style>{`
        .neu-container {
          background-color: #e0e0e0;
          color: #27272a;
        }
        .neu-button {
          background-color: #e0e0e0;
          border-radius: 50px;
          box-shadow: 4px 4px 10px #bcbcbc, -4px -4px 10px #ffffff;
          color: #4d4d4d;
          cursor: pointer;
          font-size: 16px;
          padding: 12px 32px;
          transition: all 0.2s ease-in-out;
          border: 2px solid rgb(206, 206, 206);
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .neu-button:hover {
          box-shadow: inset 3px 3px 6px #bcbcbc, inset -3px -3px 6px #ffffff;
          color: #1a1a1a;
          border-color: rgb(190, 190, 190);
        }
        .neu-button:active {
          box-shadow: inset 5px 5px 10px #bcbcbc, inset -5px -5px 10px #ffffff;
        }
        .neu-input {
          background-color: #e0e0e0;
          border-radius: 12px;
          box-shadow: inset 3px 3px 6px #bcbcbc, inset -3px -3px 6px #ffffff;
          color: #1a1a1a;
          border: 2px solid transparent;
          outline: none;
          padding: 12px 16px;
          padding-left: 44px;
          font-size: 14px;
          transition: all 0.2s ease-in-out;
        }
        .neu-input:focus {
          border-color: rgb(180, 180, 180);
        }
        .neu-card {
          background-color: #e0e0e0;
          border-radius: 24px;
          box-shadow: 8px 8px 16px #bcbcbc, -8px -8px 16px #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
      `}</style>

      {/* Left panel: Product showcase */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-surface to-background border-r border-border/40 p-12 flex-col justify-between">
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan grid place-items-center"><Brain size={18} /></div>
          <span className="font-semibold tracking-tight text-white">TalentOS</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-5xl text-gradient leading-tight">Hire beyond keywords.</h2>
          <p className="mt-4 text-muted-foreground max-w-md">
            The intelligence operating system for modern recruiting teams — trusted by Fortune 500
            talent organizations.
          </p>
        </div>
        <div className="relative text-xs text-muted-foreground">
          "TalentOS reduced our time-to-hire by 58% in the first quarter." — VP Talent, Fortune 100
        </div>
      </div>

      {/* Right panel: Neumorphic auth wizard */}
      <div className="neu-container flex items-center justify-center p-8">
        <div className="w-full max-w-md p-8 neu-card space-y-6">
          
          {/* A. SUCCESS ANIMATION OVERLAY */}
          {step === "success" ? (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Key rotating and sliding in */}
                <motion.div
                  initial={{ rotate: -90, x: -50, opacity: 0 }}
                  animate={{ rotate: 0, x: 0, opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.6, ease: "easeInOut" }}
                  className="absolute text-indigo-500 z-10"
                >
                  <KeyRound size={36} />
                </motion.div>
                
                {/* Lock locking */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
                  transition={{ delay: 0.9, duration: 0.6 }}
                  className="text-emerald-500"
                >
                  <Lock size={52} className="stroke-[2.5]" />
                </motion.div>

                {/* Glow ring */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1.6, opacity: [0, 0.4, 0] }}
                  transition={{ delay: 1.3, duration: 0.8 }}
                  className="absolute w-16 h-16 rounded-full border-2 border-emerald-400"
                />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-zinc-800">Workspace Locked In!</h2>
                <p className="text-sm text-zinc-500 font-medium">Your password configured successfully.</p>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold leading-relaxed shadow-sm w-full">
                ⚠️ Remember your password for further logins!
              </div>

              <div className="text-zinc-400 text-xs flex items-center justify-center gap-1.5 pt-4">
                <Loader2 size={12} className="animate-spin" /> Preparing dashboard assets...
              </div>
            </div>
          ) : (
            <>
              {/* 1. SELECTION STEP */}
              {mode === "select" && (
                <div className="space-y-6 text-center">
                  <div>
                    <h1 className="font-display text-4xl text-zinc-800 font-bold tracking-tight">TalentOS</h1>
                    <p className="text-sm text-zinc-500 mt-1.5">Configure your session entry point.</p>
                  </div>

                  {errorText && (
                    <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg text-center font-medium">
                      {errorText}
                    </div>
                  )}

                  <div className="flex flex-col gap-4 py-4">
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="neu-button w-full py-4 text-lg"
                    >
                      <UserPlus size={18} /> Sign Up
                    </button>

                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="neu-button w-full py-4 text-lg"
                    >
                      <LogIn size={18} /> Sign In
                    </button>

                    <button
                      type="button"
                      onClick={handleGuestLogin}
                      disabled={loadingGuest}
                      className="neu-button w-full py-4 text-lg text-indigo-600 hover:text-indigo-700"
                    >
                      {loadingGuest ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <>
                          <Sparkles size={18} /> Guest Sandbox
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-400">
                    Securely encrypted via Supabase authentication.
                  </p>
                </div>
              )}

              {/* 2. SIGN IN STEP */}
              {mode === "signin" && (
                <form onSubmit={handleSignIn} className="flex flex-col space-y-5">
                  <button
                    type="button"
                    onClick={() => setMode("select")}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer self-start"
                  >
                    <ArrowLeft size={14} /> Back to options
                  </button>

                  <div>
                    <h1 className="font-display text-3xl font-semibold text-zinc-800">Welcome Back</h1>
                    <p className="text-sm text-zinc-500 mt-1">Sign in to your TalentOS workspace.</p>
                  </div>

                  {errorText && (
                    <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg text-center font-medium">
                      {errorText}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Email</label>
                      <div className="relative flex items-center">
                        <Mail size={16} className="absolute left-4 text-zinc-400" />
                        <input
                          type="email"
                          placeholder="work@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="neu-input w-full pl-11"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between items-center pl-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Password</label>
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-indigo-600 hover:underline font-semibold cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative flex items-center">
                        <Lock size={16} className="absolute left-4 text-zinc-400" />
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="neu-input w-full pl-11"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="neu-button w-full py-3.5 text-zinc-800 disabled:opacity-50 mt-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Enter Workspace
                  </button>
                </form>
              )}

              {/* 3. SIGN UP STEP (OTP WIZARD) */}
              {mode === "signup" && (
                <div className="flex flex-col space-y-5">
                  <button
                    type="button"
                    onClick={() => setMode("select")}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer self-start"
                  >
                    <ArrowLeft size={14} /> Back to options
                  </button>

                  {errorText && (
                    <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg text-center font-medium">
                      {errorText}
                    </div>
                  )}

                  {step === "initial" && (
                    <form onSubmit={handleSendOtp} className="space-y-5">
                      <div>
                        <h1 className="font-display text-3xl font-semibold text-zinc-800">Create Account</h1>
                        <p className="text-sm text-zinc-500 mt-1">We will send a 6-digit OTP code to verify your email.</p>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Email Address</label>
                        <div className="relative flex items-center">
                          <Mail size={16} className="absolute left-4 text-zinc-400" />
                          <input
                            type="email"
                            placeholder="work@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="neu-input w-full pl-11"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="neu-button w-full py-3.5 text-zinc-800 disabled:opacity-50"
                      >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Send OTP Code <ArrowRight size={16} />
                      </button>
                    </form>
                  )}

                  {step === "otp" && (
                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                      <div>
                        <h1 className="font-display text-3xl font-semibold text-zinc-800">Verify Email</h1>
                        <p className="text-sm text-zinc-500 mt-1">
                          Enter the 6-digit OTP code sent to <span className="font-semibold text-zinc-700">{email}</span>.
                        </p>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Verification Code</label>
                        <div className="relative flex items-center">
                          <KeyRound size={16} className="absolute left-4 text-zinc-400" />
                          <input
                            type="text"
                            maxLength={6}
                            placeholder=""
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                            className="neu-input w-full pl-11 tracking-[0.25em] font-semibold text-center text-lg animate-pulse"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="neu-button w-full py-3.5 text-zinc-800 disabled:opacity-50"
                      >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Verify OTP
                      </button>

                      <div className="flex justify-between text-xs text-zinc-500 px-1">
                        <button
                          type="button"
                          onClick={() => setStep("initial")}
                          className="hover:underline cursor-pointer"
                        >
                          Change Email
                    </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="text-indigo-600 hover:underline cursor-pointer font-medium"
                        >
                          Resend Code
                        </button>
                      </div>
                    </form>
                  )}

                  {step === "password_setup" && (
                    <form onSubmit={handlePasswordSetup} className="space-y-5">
                      <div>
                        <h1 className="font-display text-3xl font-semibold text-zinc-800">Configure Password</h1>
                        <p className="text-sm text-zinc-500 mt-1">Choose a password to secure your new TalentOS account.</p>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col space-y-1">
                          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Password</label>
                          <div className="relative flex items-center">
                            <Lock size={16} className="absolute left-4 text-zinc-400" />
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="neu-input w-full pl-11"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col space-y-1">
                          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Confirm Password</label>
                          <div className="relative flex items-center">
                            <Lock size={16} className="absolute left-4 text-zinc-400" />
                            <input
                              type="password"
                              placeholder="••••••••"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="neu-input w-full pl-11"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="neu-button w-full py-3.5 text-zinc-800 disabled:opacity-50"
                      >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Complete Setup
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* 4. FORGOT PASSWORD STEP */}
              {mode === "forgot" && (
                <form onSubmit={handleResetPasswordLink} className="flex flex-col space-y-5">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer self-start"
                  >
                    <ArrowLeft size={14} /> Back to Sign In
                  </button>

                  <div>
                    <h1 className="font-display text-3xl font-semibold text-zinc-800">Reset Password</h1>
                    <p className="text-sm text-zinc-500 mt-1">We will send a password reset link to your email.</p>
                  </div>

                  {errorText && (
                    <div className="p-3 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg text-center font-medium">
                      {errorText}
                    </div>
                  )}

                  <div className="flex flex-col space-y-1">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider pl-1">Email Address</label>
                    <div className="relative flex items-center">
                      <Mail size={16} className="absolute left-4 text-zinc-400" />
                      <input
                        type="email"
                        placeholder="work@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="neu-input w-full pl-11"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="neu-button w-full py-3.5 text-zinc-800 disabled:opacity-50"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Send Reset Link
                  </button>
                </form>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
