import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let errorMessage: string;

  if (isRouteErrorResponse(error)) {
    errorMessage = error.statusText || "An error occurred";
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = "Unknown error";
  }

  return (
    <div className="bg-black size-full flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-['Rock_Salt:Regular',sans-serif] text-white text-[48px] mb-4">
          Oops!
        </h1>
        <p className="font-['Luxurious_Roman:Regular',sans-serif] text-white text-[24px] mb-8">
          {errorMessage}
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-[#8d0000] hover:bg-[#6d0000] text-white font-['Luxurious_Roman:Regular',sans-serif] text-[20px] px-8 py-3 rounded-lg transition-colors"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
