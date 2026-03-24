import { useNavigate, useLocation } from "react-router";
import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bg-black relative size-full overflow-hidden">
      <div className="absolute bg-black h-[1024px] left-0 top-0 w-[1440px]" />
      
      {/* Theater lights across the top */}
      <div className="absolute top-0 left-0 w-[1440px] h-[40px] flex justify-around items-center z-30">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="w-[30px] h-[30px] rounded-full bg-yellow-400 shadow-[0_0_20px_8px_rgba(250,204,21,0.6)]"
            style={{
              animation: `pulse ${2 + (i % 3) * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
      
      <p className="absolute font-['Rock_Salt:Regular',sans-serif] h-[92px] leading-[normal] left-[548px] not-italic text-[64px] text-white top-[2px] w-[594px] whitespace-pre-wrap z-10">Reelette</p>
      <div className="absolute h-0 left-[58px] top-[133px] w-[1324px] z-10">
        <div className="absolute inset-[-3px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1324 3">
            <line id="Line 1" stroke="var(--stroke-0, white)" strokeWidth="3" x2="1324" y1="1.5" y2="1.5" />
          </svg>
        </div>
      </div>
      
      {/* Navigation buttons */}
      <button 
        onClick={() => navigate('/home')}
        className={`absolute h-[54px] left-[58px] rounded-[6px] top-[144px] w-[310px] z-10 cursor-pointer transition-colors ${
          location.pathname === '/home' ? 'bg-[#6d0000]' : 'bg-[#8d0000] hover:bg-[#6d0000]'
        }`}
      />
      <button 
        onClick={() => navigate('/feed')}
        className={`absolute h-[54px] left-[396px] rounded-[6px] top-[144px] w-[310px] z-10 cursor-pointer transition-colors ${
          location.pathname === '/feed' ? 'bg-[#6d0000]' : 'bg-[#8d0000] hover:bg-[#6d0000]'
        }`}
      />
      <button 
        onClick={() => navigate('/wheel')}
        className={`absolute h-[54px] left-[734px] rounded-[6px] top-[144px] w-[310px] z-10 cursor-pointer transition-colors ${
          location.pathname === '/wheel' ? 'bg-[#6d0000]' : 'bg-[#8d0000] hover:bg-[#6d0000]'
        }`}
      />
      <button 
        onClick={() => navigate('/filter')}
        className={`absolute h-[54px] left-[1072px] rounded-[6px] top-[144px] w-[310px] z-10 cursor-pointer transition-colors ${
          location.pathname === '/filter' ? 'bg-[#6d0000]' : 'bg-[#8d0000] hover:bg-[#6d0000]'
        }`}
      />
      <p className="absolute font-['Luxurious_Roman:Regular',sans-serif] leading-[normal] left-[58px] w-[310px] not-italic text-[32px] text-shadow-[0px_4px_4px_rgba(0,0,0,0.25)] text-white top-[154px] z-10 pointer-events-none text-center">Trending</p>
      <p className="absolute font-['Luxurious_Roman:Regular',sans-serif] leading-[normal] left-[396px] w-[310px] not-italic text-[32px] text-white top-[154px] z-10 pointer-events-none text-center">Feed</p>
      <p className="absolute font-['Luxurious_Roman:Regular',sans-serif] leading-[normal] left-[734px] w-[310px] not-italic text-[32px] text-white top-[154px] z-10 pointer-events-none text-center">Spin the Wheel</p>
      <p className="absolute font-['Luxurious_Roman:Regular',sans-serif] leading-[normal] left-[1072px] w-[310px] not-italic text-[32px] text-white top-[154px] z-10 pointer-events-none text-center">Search by Filter</p>
      
      {/* Content area - children go here */}
      {children}
      
      {/* Profile icon */}
      <button 
        onClick={() => navigate('/messages')}
        className="absolute h-[108px] left-[1247px] top-[14px] w-[164px] z-10 cursor-pointer hover:opacity-80 transition-opacity" 
        data-name="image 1"
      >
        <img alt="Messages" className="absolute inset-0 max-w-none object-cover size-full" src="https://images.unsplash.com/photo-1646042519424-4af7799fd53a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3ZpZSUyMHRoZWF0ZXIlMjBwcm9maWxlJTIwd2hlZWx8ZW58MXx8fHwxNzczOTQzMjA3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" />
      </button>
      
      {/* Fixed movie seats at bottom */}
      <div className="fixed bottom-[-100px] left-0 h-[325px] w-[1440px] z-20 pointer-events-none" data-name="redseats-removebg-preview 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src="https://images.unsplash.com/photo-1593940256067-fb4acd831804?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWQlMjBjaW5lbWElMjB0aGVhdGVyJTIwc2VhdHN8ZW58MXx8fHwxNzczOTQzMjA4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" />
      </div>
    </div>
  );
}