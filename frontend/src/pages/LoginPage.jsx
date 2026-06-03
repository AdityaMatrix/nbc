import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import axios from "axios";

/* ─── Main detailed bearing with 3D motion ─── */
function MainBearing({ lampOn }) {
  return (
    <div className="bear-wrapper" data-testid="bearing-animation">
      <div className="bear">
        <div className={`bear-outer ${lampOn?'bear-outer--on':''}`}>
          <div className="bear-groove"/>
          {Array.from({length:10},(_,i)=>(
            <div key={`c${i}`} className={`bear-cage ${lampOn?'bear-cage--on':''}`} style={{transform:`rotate(${i*36+18}deg)`}}/>
          ))}
          {Array.from({length:10},(_,i)=>(
            <div key={i} className="bear-arm" style={{transform:`rotate(${i*36}deg)`}}>
              <div className={`bear-ball ${lampOn?'bear-ball--on':''}`}/>
            </div>
          ))}
          <div className={`bear-inner ${lampOn?'bear-inner--on':''}`}>
            <div className="bear-center">
              <div className={`bear-cross ${lampOn?'bear-cross--on':''}`}/>
            </div>
          </div>
        </div>
        <div className={`bear-glow ${lampOn?'bear-glow--on':''}`}/>
      </div>
    </div>
  );
}




/* ═══════════════════════════════════════════════ */
export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lampOn, setLampOn] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  // Auto-show login form on mobile (screen width <= 900px) and scroll to it
  useEffect(() => {
    if (window.innerWidth <= 900) {
      setTimeout(() => {
        setLampOn(true);
        setTimeout(() => {
          const form = document.querySelector('[data-testid="login-card"]');
          if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 600);
      }, 800);
    }
  }, []);

  // Space or Enter key toggles lamp (reveals login form)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.code === 'Space' || e.code === 'Enter') && !lampOn && document.activeElement === document.body) {
        e.preventDefault();
        setLampOn(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lampOn]);

  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please enter credentials"); return; }
    setIsLoading(true);
    try {
      const userData = await login(email, password);
      toast.success("Welcome back!");
      setExiting(true);
      setTimeout(() => navigate(userData.role === "admin" ? "/admin" : "/dashboard"), 1200);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error("Enter your email"); return; }
    setForgotLoading(true);
    try {
      await axios.post(`${API}/auth/forgot-password`, { email: forgotEmail });
      toast.success("Reset request submitted! An admin will review it shortly.");
      setShowForgot(false); setForgotEmail("");
    } catch { toast.error("Failed to submit reset request"); }
    finally { setForgotLoading(false); }
  };

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/dashboard';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className={`lp ${mounted?'lp--in':''} ${lampOn?'lp--lit':''} ${exiting?'lp--exit':''}`} data-testid="login-page">

      {/* ── Space light rays from background ── */}
      <div className="space-light space-light-1"/>
      <div className="space-light space-light-2"/>
      <div className="space-light space-light-3"/>

      {/* ── Nebula glow effects ── */}
      <div className="nebula nebula-1"/>
      <div className="nebula nebula-2"/>
      <div className="nebula nebula-3"/>

      {/* ── Static stars ── */}
      <div className="stars-static" data-testid="stars-layer"/>

      {/* Moon */}
      <div className={`moon ${lampOn?'moon--dim':''}`}/>

      {/* Warm light wash from lamp */}
      <div className={`light-wash ${lampOn?'light-wash--on':''}`}/>

      {/* ═══ SCENE: morphs from centered to split ═══ */}
      <div className={`scene ${lampOn?'scene--split':''}`}>

        {/* Left content: lamp, bearing, brand */}
        <div className="scene-l">
          <MainBearing lampOn={lampOn}/>
          <div className="brand">
            <h1 className="brand-t" data-testid="page-title">
              <span className="brand-t-cap">CAPEX</span>{" "}
              <span className="brand-t-proc">Procurement</span>{" "}
              <span className="brand-t-port">Portal</span>
            </h1>
            <p className="brand-d">Streamline your capital expenditure lifecycle — from request submission and multi-level approvals to procurement tracking, sample management, and commissioning.</p>
            <div className="brand-sig" data-testid="creator-branding">
              <div className="sig-line"/>
              <span className="sig-by">Designed & Developed by</span>
              <span className="sig-name">Saurabh Jangir</span>
            </div>
          </div>
        </div>

        {/* Right: Login form — morphs in from right */}
        <div className={`scene-r ${lampOn?'scene-r--show':''}`}>
          <div className="lcard" data-testid="login-card">
            <div className="lcard-head">
              <div className="lcard-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>
              <h2 className="lcard-title" data-testid="login-title">Portal Login</h2>
              <p className="lcard-sub">Access your CAPEX management portal</p>
            </div>

            {!showForgot ? (
              <>
                <form onSubmit={handleSubmit} className="lcard-form" data-testid="login-form">
                  <div className="ff">
                    <label className="fl">Email ID</label>
                    <Input type="email" placeholder="Enter your email" value={email}
                      onChange={e=>setEmail(e.target.value)} className="fi" data-testid="login-email-input"/>
                  </div>
                  <div className="ff">
                    <label className="fl">Password</label>
                    <div className="relative">
                      <Input type={showPassword?"text":"password"} placeholder="Enter password"
                        value={password} onChange={e=>setPassword(e.target.value)}
                        className="fi pr-10" data-testid="login-password-input"/>
                      <button type="button" onClick={()=>setShowPassword(p=>!p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        data-testid="toggle-password-btn">
                        {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="button" onClick={()=>setShowForgot(true)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300"
                      data-testid="forgot-password-link">Forgot password?</button>
                  </div>
                  <Button type="submit" disabled={isLoading}
                    className="login-btn" data-testid="login-submit-btn">
                    {isLoading ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/>Signing in...</> : "Login"}
                  </Button>
                </form>
                <div className="divider"><div className="div-l"/><span className="div-t">or</span><div className="div-l"/></div>
                <Button variant="outline" onClick={handleGoogleLogin}
                  className="g-btn" data-testid="google-login-btn">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>Sign in with Google
                </Button>
              </>
            ) : (
              <form onSubmit={handleForgotPassword} className="lcard-form">
                <div className="text-center mb-3">
                  <h3 className="text-sm font-bold text-white">Password Reset</h3>
                  <p className="text-[11px] text-white/40 mt-1">An admin will reset your password.</p>
                </div>
                <div className="ff">
                  <Input type="email" placeholder="Enter your email" value={forgotEmail}
                    onChange={e=>setForgotEmail(e.target.value)} className="fi" data-testid="forgot-email-input"/>
                </div>
                <Button type="submit" disabled={forgotLoading} className="login-btn" data-testid="forgot-submit-btn">
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : "Submit Reset Request"}
                </Button>
                <button type="button" onClick={()=>setShowForgot(false)}
                  className="w-full text-[11px] text-white/40 hover:text-white/60 mt-2 text-center"
                  data-testid="back-to-login-link">Back to login</button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
/* ═══ BASE ═══ */
.lp{position:fixed;inset:0;overflow:hidden;
  background:linear-gradient(145deg,#020408 0%,#060b16 25%,#0a0e1c 50%,#04070e 100%);
  font-family:'Inter',system-ui,sans-serif;transition:opacity 1.2s ease,filter 1.2s ease,transform 1.2s ease}
.lp--in{opacity:1}
.lp--exit{opacity:0;filter:blur(14px);transform:scale(1.06)}

/* ═══ SPACE LIGHT RAYS ═══ */
.space-light{position:fixed;pointer-events:none;opacity:.6;transition:opacity 1.4s ease}
.space-light-1{top:-20%;left:15%;width:300px;height:900px;
  background:linear-gradient(180deg,rgba(56,189,248,.06) 0%,rgba(139,92,246,.03) 40%,transparent 100%);
  transform:rotate(-15deg);filter:blur(60px)}
.space-light-2{top:-10%;right:20%;width:250px;height:800px;
  background:linear-gradient(180deg,rgba(168,85,247,.05) 0%,rgba(236,72,153,.02) 40%,transparent 100%);
  transform:rotate(12deg);filter:blur(70px)}
.space-light-3{top:0;left:45%;width:200px;height:700px;
  background:linear-gradient(180deg,rgba(34,211,238,.04) 0%,rgba(59,130,246,.02) 40%,transparent 100%);
  transform:rotate(-5deg);filter:blur(50px)}
.lp--lit .space-light{opacity:.9}

/* ═══ NEBULA GLOW ═══ */
.nebula{position:fixed;border-radius:50%;pointer-events:none;filter:blur(100px);transition:all 1.8s ease}
.nebula-1{width:500px;height:500px;top:-10%;left:-5%;
  background:radial-gradient(circle,rgba(99,102,241,.1),rgba(139,92,246,.05),transparent 70%)}
.nebula-2{width:600px;height:400px;bottom:-5%;right:-10%;
  background:radial-gradient(circle,rgba(6,182,212,.08),rgba(34,211,238,.04),transparent 70%)}
.nebula-3{width:350px;height:350px;top:40%;right:30%;
  background:radial-gradient(circle,rgba(236,72,153,.05),rgba(244,114,182,.02),transparent 70%)}
.lp--lit .nebula-1{background:radial-gradient(circle,rgba(99,102,241,.15),rgba(139,92,246,.08),transparent 70%)}
.lp--lit .nebula-2{background:radial-gradient(circle,rgba(253,230,138,.08),rgba(251,191,36,.04),transparent 70%)}
.lp--lit .nebula-3{background:radial-gradient(circle,rgba(236,72,153,.07),rgba(244,114,182,.03),transparent 70%)}

/* ═══ STATIC STARS ═══ */
.stars-static{position:fixed;inset:0;pointer-events:none;
  background-image:
    radial-gradient(1px 1px at 10% 15%,rgba(255,255,255,.6),transparent),
    radial-gradient(1.5px 1.5px at 25% 8%,rgba(200,220,255,.5),transparent),
    radial-gradient(1px 1px at 40% 22%,rgba(255,255,255,.4),transparent),
    radial-gradient(1.5px 1.5px at 55% 5%,rgba(180,200,255,.55),transparent),
    radial-gradient(1px 1px at 70% 18%,rgba(255,255,255,.35),transparent),
    radial-gradient(2px 2px at 85% 12%,rgba(200,230,255,.5),transparent),
    radial-gradient(1px 1px at 15% 45%,rgba(255,255,255,.3),transparent),
    radial-gradient(1.5px 1.5px at 30% 55%,rgba(180,200,255,.4),transparent),
    radial-gradient(1px 1px at 50% 40%,rgba(255,255,255,.4),transparent),
    radial-gradient(1px 1px at 65% 50%,rgba(200,220,255,.3),transparent),
    radial-gradient(1.5px 1.5px at 80% 42%,rgba(255,255,255,.35),transparent),
    radial-gradient(1px 1px at 92% 35%,rgba(180,210,255,.4),transparent),
    radial-gradient(1px 1px at 8% 75%,rgba(255,255,255,.35),transparent),
    radial-gradient(1px 1px at 22% 82%,rgba(200,220,255,.3),transparent),
    radial-gradient(1.5px 1.5px at 45% 70%,rgba(255,255,255,.4),transparent),
    radial-gradient(1px 1px at 60% 78%,rgba(180,200,255,.35),transparent),
    radial-gradient(1px 1px at 75% 85%,rgba(255,255,255,.3),transparent),
    radial-gradient(1.5px 1.5px at 88% 72%,rgba(200,230,255,.45),transparent),
    radial-gradient(1px 1px at 5% 92%,rgba(255,255,255,.25),transparent),
    radial-gradient(1px 1px at 35% 95%,rgba(180,200,255,.3),transparent),
    radial-gradient(2px 2px at 95% 90%,rgba(255,255,255,.35),transparent)}

/* ═══ MOON ═══ */
.moon{position:fixed;top:4%;right:7%;width:80px;height:80px;border-radius:50%;
  background:radial-gradient(circle at 60% 35%,#e8e8ec,#b0b4c0 40%,#686878 80%,transparent);
  box-shadow:0 0 50px rgba(200,205,220,.12),0 0 100px rgba(200,205,220,.06);
  opacity:.5;transition:opacity 1.4s ease}
.moon--dim{opacity:.15}

/* ═══ LIGHT WASH ═══ */
.light-wash{position:fixed;inset:0;pointer-events:none;
  background:radial-gradient(ellipse at 30% 15%,rgba(255,240,200,.1) 0%,rgba(255,225,160,.04) 30%,transparent 60%);
  opacity:0;transition:opacity 1.4s ease}
.light-wash--on{opacity:1}

/* ═══ SCENE LAYOUT — morph transition ═══ */
.scene{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:10;
  transition:all 1.2s cubic-bezier(.22,1,.36,1)}
.scene--split{justify-content:flex-start}

/* Left content panel — morphs to left */
.scene-l{display:flex;flex-direction:column;align-items:center;width:100%;max-width:480px;
  transition:all 1.2s cubic-bezier(.22,1,.36,1);padding:20px}
.scene--split .scene-l{width:48%;margin-left:4%}

/* Right login panel — morphs in from right */
.scene-r{position:absolute;right:0;top:0;width:48%;height:100%;display:flex;align-items:center;justify-content:center;
  transform:translateX(80px) scale(.96);opacity:0;pointer-events:none;
  transition:all 1.2s cubic-bezier(.22,1,.36,1) .1s}
.scene-r--show{transform:translateX(0) scale(1);opacity:1;pointer-events:auto}




/* ═══ MAIN BEARING — 3D MOTION ═══ */
.bear-wrapper{perspective:800px;margin:10px 0}
.bear{position:relative;width:220px;height:220px;
  animation:bear3d 8s ease-in-out infinite;transform-style:preserve-3d}
@media(min-width:900px){.bear{width:260px;height:260px}}

@keyframes bear3d{
  0%{transform:rotateX(0deg) rotateY(0deg) rotateZ(0deg)}
  25%{transform:rotateX(8deg) rotateY(-6deg) rotateZ(90deg)}
  50%{transform:rotateX(-4deg) rotateY(8deg) rotateZ(180deg)}
  75%{transform:rotateX(6deg) rotateY(-4deg) rotateZ(270deg)}
  100%{transform:rotateX(0deg) rotateY(0deg) rotateZ(360deg)}
}

.bear-outer{position:absolute;inset:0;border-radius:50%;
  background:conic-gradient(from 0deg,#6b7280,#9ca3af,#78808e,#b0b8c4,#6b7280,#8b929d,#9ca3af,#78808e,#6b7280);
  box-shadow:0 0 0 3px #374151,inset 0 0 0 20px rgba(10,15,25,.8),inset 0 0 16px rgba(0,0,0,.5),0 6px 24px rgba(0,0,0,.5);
  transition:all 1s ease}
.bear-outer--on{background:conic-gradient(from 0deg,#c0c5cc,#e2e4e8,#a8afba,#d4d8de,#c0c5cc,#cfd2d8,#e2e4e8,#a8afba,#c0c5cc);
  box-shadow:0 0 0 3px #9ca3af,inset 0 0 0 18px rgba(10,15,25,.65),inset 0 0 12px rgba(0,0,0,.3),0 6px 30px rgba(0,0,0,.3),0 0 50px rgba(255,240,200,.05)}
.bear-groove{position:absolute;inset:20px;border-radius:50%;
  background:radial-gradient(circle,transparent 46%,rgba(35,42,55,.6) 50%,rgba(18,24,38,.7) 65%,rgba(35,42,55,.5) 70%,transparent 73%)}
.bear-cage{position:absolute;top:50%;left:50%;width:0;height:0}
.bear-cage::before{content:'';position:absolute;width:3px;height:16px;border-radius:1px;
  transform:translate(-50%,-50%) translateX(82px);
  background:linear-gradient(180deg,#6b7340,#9ca84c,#6b7340);opacity:.35;transition:all 1s ease}
@media(min-width:900px){.bear-cage::before{width:4px;height:20px;transform:translate(-50%,-50%) translateX(98px)}}
.bear-cage--on::before{background:linear-gradient(180deg,#8898b0,#b0c0d5,#8898b0);opacity:.5}
.bear-arm{position:absolute;top:50%;left:50%;width:0;height:0}
.bear-ball{width:24px;height:24px;border-radius:50%;position:relative;z-index:5;
  transform:translate(-50%,-50%) translateX(82px);
  background:radial-gradient(circle at 35% 30%,#fff,#e8eaef 18%,#b8c0cc 38%,#7a8595 58%,#4a5565 80%,#2a3545 100%);
  border:1px solid rgba(180,195,210,.4);
  box-shadow:0 0 8px rgba(180,200,220,.5),1px 2px 4px rgba(0,0,0,.5),
    inset -2px -2px 4px rgba(0,0,0,.2),inset 2px 2px 4px rgba(255,255,255,.7);
  transition:all 1s ease}
@media(min-width:900px){.bear-ball{width:30px;height:30px;transform:translate(-50%,-50%) translateX(98px)}}
.bear-ball--on{
  background:radial-gradient(circle at 35% 30%,#fff,#fff8e4 18%,#e8d8a8 38%,#c8b070 58%,#906a38 80%,#503820 100%);
  border-color:rgba(253,230,138,.4);
  box-shadow:0 0 12px rgba(253,230,138,.4),0 0 4px rgba(255,248,220,.4),1px 2px 4px rgba(0,0,0,.3),
    inset -2px -2px 4px rgba(0,0,0,.15),inset 2px 2px 4px rgba(255,255,255,.75)}
.bear-inner{position:absolute;inset:48px;border-radius:50%;
  background:conic-gradient(from 45deg,#78808e,#5a6272,#94a0ad,#6b7280,#78808e,#5a6272,#94a0ad,#6b7280,#78808e);
  box-shadow:0 0 0 2px #374151,inset 0 0 10px rgba(0,0,0,.5);transition:all 1s ease}
.bear-inner--on{background:conic-gradient(from 45deg,#bcc2cb,#9ca3af,#d4d8de,#a8afba,#bcc2cb,#9ca3af,#d4d8de,#a8afba,#bcc2cb);
  box-shadow:0 0 0 2px #9ca3af,inset 0 0 8px rgba(0,0,0,.3),0 0 20px rgba(255,240,200,.03)}
.bear-center{position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle,#0c1018,#1a2030 60%,#252d3d);
  border:2px solid #3d4450;display:flex;align-items:center;justify-content:center}
.bear-cross{width:14px;height:14px;
  background:linear-gradient(#475569,#475569) center/1.5px 100% no-repeat,linear-gradient(#475569,#475569) center/100% 1.5px no-repeat;
  opacity:.35;transition:all 1s ease}
.bear-cross--on{opacity:.65;background:linear-gradient(#fde68a,#fde68a) center/2px 100% no-repeat,linear-gradient(#fde68a,#fde68a) center/100% 2px no-repeat}
.bear-glow{position:absolute;inset:-16px;border-radius:50%;
  border:1px solid rgba(100,116,139,.04);transition:all 1s ease;
  background:radial-gradient(circle,transparent 60%,rgba(99,102,241,.02) 80%,transparent)}
.bear-glow--on{border-color:rgba(139,92,246,.1);
  box-shadow:0 0 40px rgba(139,92,246,.06),0 0 80px rgba(99,102,241,.03);
  background:radial-gradient(circle,transparent 60%,rgba(253,230,138,.04) 80%,transparent)}

/* ═══ COLORFUL BRAND TEXT ═══ */
.brand{text-align:center;margin-top:18px}
.brand-t{font-size:24px;font-weight:900;letter-spacing:.03em;margin:0;line-height:1.3}
.brand-t-cap{
  background:linear-gradient(135deg,#38bdf8,#818cf8,#c084fc);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;filter:drop-shadow(0 0 20px rgba(129,140,248,.2))}
.brand-t-proc{
  background:linear-gradient(135deg,#34d399,#2dd4bf,#22d3ee);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;filter:drop-shadow(0 0 20px rgba(45,212,191,.2))}
.brand-t-port{
  background:linear-gradient(135deg,#fb923c,#f472b6,#c084fc);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;filter:drop-shadow(0 0 20px rgba(244,114,182,.2))}
/* Lit state: glow intensifies */
.lp--lit .brand-t-cap{filter:drop-shadow(0 0 30px rgba(129,140,248,.35))}
.lp--lit .brand-t-proc{filter:drop-shadow(0 0 30px rgba(45,212,191,.35))}
.lp--lit .brand-t-port{filter:drop-shadow(0 0 30px rgba(244,114,182,.35))}

.brand-d{font-size:11px;color:rgba(148,163,184,.45);max-width:360px;margin:10px auto 0;line-height:1.6;transition:color 1s ease}
.lp--lit .brand-d{color:rgba(148,163,184,.6)}

/* Creator signature */
.brand-sig{margin-top:20px;display:flex;flex-direction:column;align-items:center;gap:4px}
.sig-line{width:40px;height:1px;
  background:linear-gradient(90deg,transparent,rgba(129,140,248,.4),rgba(45,212,191,.4),transparent);
  margin-bottom:4px;transition:background 1s ease}
.lp--lit .sig-line{background:linear-gradient(90deg,transparent,rgba(253,230,138,.5),rgba(251,191,36,.4),transparent)}
.sig-by{font-size:8px;color:rgba(148,163,184,.35);text-transform:uppercase;letter-spacing:.15em;transition:color 1s ease}
.lp--lit .sig-by{color:rgba(253,230,138,.45)}
.sig-name{font-size:15px;font-weight:700;
  background:linear-gradient(135deg,#94a3b8,#cbd5e1);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;transition:all 1s ease}
.lp--lit .sig-name{
  background:linear-gradient(135deg,#fef3c7,#fde68a);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;filter:drop-shadow(0 0 12px rgba(253,230,138,.2))}

/* ═══ LOGIN CARD ═══ */
.lcard{width:100%;max-width:380px;padding:32px 28px;border-radius:16px;
  background:rgba(8,15,30,.85);backdrop-filter:blur(24px);
  border:1px solid rgba(139,92,246,.1);
  box-shadow:0 20px 60px rgba(0,0,0,.4),0 0 80px rgba(139,92,246,.03)}
.lcard-head{margin-bottom:20px}
.lcard-icon{width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.2);
  display:flex;align-items:center;justify-content:center;color:#22d3ee;margin-bottom:12px}
.lcard-title{font-size:20px;font-weight:800;color:#f1f5f9;margin:0}
.lcard-sub{font-size:11px;color:rgba(148,163,184,.5);margin:4px 0 0}
.lcard-form{display:flex;flex-direction:column;gap:14px}
.ff{display:flex;flex-direction:column;gap:4px}
.fl{font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em}
.fi{background:rgba(15,23,42,.6)!important;border:1px solid rgba(148,163,184,.1)!important;color:#e2e8f0!important;
  font-size:13px!important;border-radius:8px!important;height:40px!important;transition:border-color .3s!important}
.fi:focus{border-color:rgba(6,182,212,.4)!important;box-shadow:0 0 0 3px rgba(6,182,212,.08)!important}
.login-btn{width:100%;height:42px!important;font-weight:700!important;font-size:13px!important;
  background:linear-gradient(135deg,#0891b2,#0e7490)!important;border:none!important;
  border-radius:10px!important;color:#fff!important;cursor:pointer;transition:all .25s!important}
.login-btn:hover{box-shadow:0 4px 20px rgba(6,182,212,.25)!important;transform:translateY(-1px)}
.login-btn:disabled{opacity:.6!important;transform:none!important}
.divider{display:flex;align-items:center;gap:10px;margin:14px 0}
.div-l{flex:1;height:1px;background:rgba(148,163,184,.08)}
.div-t{font-size:10px;color:rgba(148,163,184,.3)}
.g-btn{width:100%!important;height:40px!important;background:rgba(15,23,42,.4)!important;
  border:1px solid rgba(148,163,184,.1)!important;color:#cbd5e1!important;font-size:12px!important;
  border-radius:10px!important;transition:all .25s!important}
.g-btn:hover{background:rgba(15,23,42,.6)!important;border-color:rgba(148,163,184,.2)!important}

/* ═══ RESPONSIVE ═══ */
@media(max-width:900px){
  .lp{overflow-y:auto}
  .scene{flex-direction:column;position:relative;min-height:auto;padding:10px 0 30px}
  .scene--split{justify-content:flex-start}
  .scene--split .scene-l{width:100%;margin-left:0;padding:10px 20px}
  .scene-r{position:relative;width:100%;height:auto;margin-top:10px;padding:0 20px;
    transform:none;opacity:1;pointer-events:auto}
  .scene-r--show{transform:none}
  .bear-wrapper{margin:0}
  .bear{width:130px;height:130px}
  .moon{width:40px;height:40px;top:2%;right:4%}
  .brand{margin-top:10px}
  .brand-t{font-size:16px}
  .brand-d{display:none}
  .brand-sig{margin-top:10px}
  .sig-name{font-size:13px}
  .lcard{padding:24px 20px;max-width:100%}
  .lcard-title{font-size:18px}
}

/* ═══ BADGE HIDE ═══ */
/* badge hide */
#emergent-badge,[id*="emergent-badge"]{display:none!important;visibility:hidden!important;opacity:0!important}
      `}</style>
    </div>
  );
}
