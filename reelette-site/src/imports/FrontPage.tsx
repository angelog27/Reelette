import imgImage1 from "figma:asset/36bfec4369dcd572a6b115ced49346d5de014d2e.png";
import imgRedseatsRemovebgPreview1 from "figma:asset/12f977699090b5688152e0306840f15ebc21b588.png";

export default function FrontPage() {
  return (
    <div className="bg-white relative size-full" data-name="Front-Page">
      <div className="absolute bg-black h-[1024px] left-0 top-0 w-[1440px]" />
      <p className="absolute font-['Rock_Salt:Regular',sans-serif] h-[92px] leading-[normal] left-[548px] not-italic text-[64px] text-white top-[2px] w-[594px] whitespace-pre-wrap">Reelette</p>
      <div className="absolute h-0 left-[58px] top-[133px] w-[1324px]">
        <div className="absolute inset-[-3px_0_0_0]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1324 3">
            <line id="Line 1" stroke="var(--stroke-0, white)" strokeWidth="3" x2="1324" y1="1.5" y2="1.5" />
          </svg>
        </div>
      </div>
      <div className="absolute bg-[#8d0000] h-[54px] left-[58px] rounded-[6px] top-[144px] w-[434px]" data-name="Rounded rectangle" />
      <div className="absolute bg-[#8d0000] h-[54px] left-[503px] rounded-[6px] top-[144px] w-[434px]" />
      <div className="absolute bg-[#8d0000] h-[54px] left-[948px] rounded-[6px] top-[144px] w-[434px]" />
      <p className="absolute font-['Luxurious_Roman:Regular',sans-serif] leading-[normal] left-[240px] not-italic text-[36px] text-shadow-[0px_4px_4px_rgba(0,0,0,0.25)] text-white top-[152px]">Feed</p>
      <p className="absolute font-['Luxurious_Roman:Regular',sans-serif] h-[67px] leading-[normal] left-[587px] not-italic text-[36px] text-white top-[152px] w-[571px] whitespace-pre-wrap">Spin the Wheel</p>
      <p className="absolute font-['Luxurious_Roman:Regular',sans-serif] h-[58px] leading-[normal] left-[1034px] not-italic text-[36px] text-white top-[152px] w-[589px] whitespace-pre-wrap">Search by Filter</p>
      <div className="absolute bg-[#383232] h-[750px] left-[58px] top-[238px] w-[1324px]" />
      <div className="absolute h-[108px] left-[1247px] top-[14px] w-[164px]" data-name="image 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgImage1} />
      </div>
      <div className="absolute h-[825px] left-0 top-[474px] w-[1440px]" data-name="redseats-removebg-preview 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgRedseatsRemovebgPreview1} />
      </div>
    </div>
  );
}