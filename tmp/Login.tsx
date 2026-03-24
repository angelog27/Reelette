import { useState } from "react";
import { useNavigate } from "react-router";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username && password) {
      navigate("/home");
    } else {
      alert("Please enter both username and password");
    }
  };

  const handleSignUp = () => {
    if (username && password) {
      alert(`Signing up with username: ${username}`);
      navigate("/home");
    } else {
      alert("Please enter both username and password");
    }
  };

  const handleForgotPassword = () => {
    alert("Password reset link would be sent to your email");
  };

  return (
    <div className="bg-white relative size-full">
      {/* Background ellipses */}
      <div className="absolute flex h-[1422px] items-center justify-center left-[-155px] top-[-614px] w-[1900.964px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "19" } as React.CSSProperties}>
        <div className="flex-none rotate-14">
          <div className="h-[1041.824px] relative w-[1699.404px]">
            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1699.4 1041.82">
              <ellipse cx="849.702" cy="520.912" fill="var(--fill-0, #8D0000)" id="Ellipse 1" rx="849.702" ry="520.912" />
            </svg>
          </div>
        </div>
      </div>
      <div className="absolute flex h-[1416.321px] items-center justify-center left-[360px] top-[278px] w-[1608.421px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "19" } as React.CSSProperties}>
        <div className="-rotate-27 flex-none">
          <div className="h-[904.656px] relative w-[1344.228px]">
            <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1344.23 904.656">
              <ellipse cx="672.114" cy="452.328" fill="var(--fill-0, black)" id="Ellipse 2" rx="672.114" ry="452.328" />
            </svg>
          </div>
        </div>
      </div>

      {/* Login heading and underline */}
      <p className="absolute font-['Prompt:SemiBold',sans-serif] h-[180px] leading-[normal] left-[29px] not-italic text-[96px] text-black top-[446px] w-[381px] whitespace-pre-wrap">Login</p>
      <div className="absolute h-0 left-[29px] top-[594px] w-[263px]">
        <div className="absolute inset-[-10px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 263 10">
            <line id="Line 1" stroke="var(--stroke-0, black)" strokeWidth="10" x2="263" y1="5" y2="5" />
          </svg>
        </div>
      </div>

      {/* Username field */}
      <p className="absolute font-['Prompt:Regular',sans-serif] h-[48px] leading-[normal] left-[29px] not-italic text-[32px] text-black top-[674px] w-[574px] whitespace-pre-wrap">Username:</p>
      <input
        type="text"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="absolute font-['Prompt:Regular',sans-serif] h-[48px] leading-[normal] left-[210px] not-italic text-[32px] text-black top-[674px] w-[407px] bg-transparent border-none outline-none"
        placeholder=""
      />
      <div className="absolute h-0 left-[29px] top-[722px] w-[585.008px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 585.008 1">
            <line id="Line 2" stroke="var(--stroke-0, black)" x2="585.008" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Password field */}
      <p className="absolute font-['Prompt:Regular',sans-serif] h-[48px] leading-[normal] left-[32px] not-italic text-[32px] text-black top-[784px] w-[585px] whitespace-pre-wrap">Password:</p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="absolute font-['Prompt:Regular',sans-serif] h-[48px] leading-[normal] left-[200px] not-italic text-[32px] text-black top-[784px] w-[417px] bg-transparent border-none outline-none"
        placeholder=""
      />
      <div className="absolute h-0 left-[32px] top-[832px] w-[585.008px]">
        <div className="absolute inset-[-1px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 585.008 1">
            <line id="Line 2" stroke="var(--stroke-0, black)" x2="585.008" y1="0.5" y2="0.5" />
          </svg>
        </div>
      </div>

      {/* Forgot Password link */}
      <p 
        onClick={handleForgotPassword}
        className="absolute font-['Prompt:Regular',sans-serif] h-[22px] leading-[normal] left-[29px] not-italic text-[#8d0000] text-[16px] top-[849px] w-[323px] whitespace-pre-wrap cursor-pointer hover:underline"
      >
        Forgot Password?
      </p>

      {/* Login button */}
      <button onClick={handleLogin} className="absolute bg-[#8d0000] h-[77px] left-[29px] rounded-[13px] top-[911px] w-[278px] cursor-pointer hover:bg-[#6d0000] transition-colors" />
      <p className="absolute font-['Prompt:Regular',sans-serif] h-[113px] leading-[normal] left-[108px] not-italic text-[48px] text-white top-[911px] w-[209px] whitespace-pre-wrap pointer-events-none">Login</p>

      {/* Sign Up button - symmetrical to Login */}
      <button onClick={handleSignUp} className="absolute bg-[#8d0000] h-[77px] left-[339px] rounded-[13px] top-[911px] w-[278px] cursor-pointer hover:bg-[#6d0000] transition-colors" />
      <p className="absolute font-['Prompt:Regular',sans-serif] h-[113px] leading-[normal] left-[393px] not-italic text-[48px] text-white top-[911px] w-[209px] whitespace-pre-wrap pointer-events-none">Sign Up</p>

      {/* Logo - Using text as placeholder */}
      <div className="absolute h-[459px] left-[491px] top-[19px] w-[458px] flex items-center justify-center">
        <div className="text-center">
          <p className="font-['Rock_Salt:Regular',sans-serif] text-[72px] text-[#8d0000]">Reelette</p>
          <p className="font-['Luxurious_Roman:Regular',sans-serif] text-[24px] text-black mt-4">Movie Theater App</p>
        </div>
      </div>
    </div>
  );
}
